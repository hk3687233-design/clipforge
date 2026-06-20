"""
License management:
  POST /api/license/activate  — validate key with Lemon Squeezy, save to DB
  POST /api/license/verify    — fast local DB check (with device binding)
  POST /api/license/webhook   — Lemon Squeezy order webhook -> generate key + send email
  GET  /api/admin/licenses    — admin: list all licenses
  GET  /api/admin/stats       — admin: dashboard stats
"""
import hmac
import hashlib
import json
import uuid
import re
import urllib.request
import urllib.parse
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import Optional

from app.database import get_db, License, Job, User
from app.config import settings
from app.services.email import send_license_email

router = APIRouter(tags=["license"])
limiter = Limiter(key_func=get_remote_address)

# Key format: CF-PRO-XXXXXX-XXXXXX-XXXXXX or CF-FREE-XXXXXX-XXXXXX-XXXXXX
KEY_PATTERN = re.compile(r"^CF-(PRO|FREE)-[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$")


# ── Schemas ────────────────────────────────────────────────────────────────

class ActivateRequest(BaseModel):
    key: str
    device_id: Optional[str] = None   # browser fingerprint

class VerifyRequest(BaseModel):
    key: str
    device_id: Optional[str] = None   # browser fingerprint

class FreeSignupRequest(BaseModel):
    email: str


# ── Helpers ────────────────────────────────────────────────────────────────

def _generate_key(plan: str = "pro") -> str:
    prefix = "CF-PRO" if plan == "pro" else "CF-FREE"
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}-{uuid.uuid4().hex[:6].upper()}-{uuid.uuid4().hex[:6].upper()}"


def _ls_validate(key: str) -> dict:
    """Call Lemon Squeezy API to validate a license key."""
    if not settings.lemon_squeezy_api_key:
        # No LS API key set — only keys already saved to DB (via webhook) are valid.
        # DB lookup happens before this function is called, so reaching here means
        # the key is NOT in our DB → reject it.
        return {"valid": False, "plan": "pro"}
    try:
        payload = urllib.parse.urlencode({"license_key": key}).encode()
        req = urllib.request.Request(
            "https://api.lemonsqueezy.com/v1/licenses/validate",
            data=payload,
            headers={
                "Authorization": f"Bearer {settings.lemon_squeezy_api_key}",
                "Accept": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return {
                "valid": data.get("valid", False),
                "plan": "pro",
                "instance_id": data.get("instance", {}).get("id", ""),
            }
    except Exception as e:
        raise HTTPException(503, f"License server unreachable: {e}")


# ── Routes ─────────────────────────────────────────────────────────────────

@router.post("/api/license/activate")
@limiter.limit("10/minute")
def activate_license(request: Request, req: ActivateRequest, db: Session = Depends(get_db)):
    """Validate key (locally first, then Lemon Squeezy), save to DB with device binding."""

    key = req.key.strip().upper()

    # 1. Key format validation — reject garbage immediately
    if not KEY_PATTERN.match(key):
        raise HTTPException(403, "Invalid license key format")

    # 2. Check local DB first
    lic = db.query(License).filter(License.key == key).first()
    if lic:
        if not lic.is_valid:
            raise HTTPException(403, "This license key has been disabled")

        # Device binding check
        if lic.device_id and req.device_id and lic.device_id != req.device_id:
            raise HTTPException(403, "This key is already activated on another device. Each license allows 1 device only.")

        # Bind device if not yet bound
        if req.device_id and not lic.device_id:
            lic.device_id = req.device_id
            lic.activated_at = datetime.utcnow()
            db.commit()

        return {"valid": True, "plan": lic.plan}

    # 3. CF-FREE keys must exist in DB (generated via webhook) — no LS check
    if key.startswith("CF-FREE"):
        raise HTTPException(403, "Invalid license key")

    # 4. Validate with Lemon Squeezy
    result = _ls_validate(key)
    if not result["valid"]:
        raise HTTPException(403, "Invalid or expired license key")

    # 5. Save to local DB with device binding
    new_lic = License(
        key=key,
        plan=result.get("plan", "pro"),
        instance_id=result.get("instance_id", ""),
        device_id=req.device_id,
        activated_at=datetime.utcnow(),
        is_valid=True,
    )
    db.add(new_lic)
    db.commit()

    return {"valid": True, "plan": new_lic.plan}


@router.post("/api/license/verify")
@limiter.limit("30/minute")
def verify_license(request: Request, req: VerifyRequest, db: Session = Depends(get_db)):
    """Fast local check — used on every app load. Also verifies device binding."""
    key = req.key.strip().upper()

    # Format check
    if not KEY_PATTERN.match(key):
        raise HTTPException(403, "Invalid license")

    lic = db.query(License).filter(License.key == key).first()
    if not lic or not lic.is_valid:
        raise HTTPException(403, "Invalid or disabled license")

    # Device binding — if key is bound to a device, enforce it
    if lic.device_id and req.device_id and lic.device_id != req.device_id:
        raise HTTPException(403, "License is bound to another device")

    return {"valid": True, "plan": lic.plan}


@router.post("/api/license/free-signup")
def free_signup(req: FreeSignupRequest, db: Session = Depends(get_db)):
    """Free plan signup — store email, return access token. No email sent, no key shown."""
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Invalid email address")

    # Check if email already registered
    existing = db.query(License).filter(License.email == email, License.plan == "free").first()
    if existing and existing.is_valid:
        return {"key": existing.key, "plan": "free", "existing": True}

    # Generate internal access key (not shown to user)
    key = _generate_key("free")
    lic = License(key=key, email=email, plan="free", is_valid=True)
    db.add(lic)
    db.commit()

    # No email sent — direct access granted
    return {"key": key, "plan": "free", "existing": False}


@router.post("/api/license/webhook")
async def lemon_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Lemon Squeezy order webhook.
    On successful order -> generate license key -> save to DB -> send email.
    """
    body = await request.body()

    # Verify signature
    if settings.lemon_squeezy_webhook_secret:
        sig = request.headers.get("X-Signature", "")
        expected = hmac.new(
            settings.lemon_squeezy_webhook_secret.encode(),
            msg=body,
            digestmod=hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            raise HTTPException(400, "Invalid webhook signature")

    data = json.loads(body)
    event = data.get("meta", {}).get("event_name", "")

    if event not in ("order_created", "subscription_created"):
        return {"received": True}

    attrs = data.get("data", {}).get("attributes", {})
    customer_email = attrs.get("user_email", "")
    order_id = str(data.get("data", {}).get("id", ""))
    variant_id = str(attrs.get("first_order_item", {}).get("variant_id", ""))

    # Determine plan from variant
    plan = "pro"
    if settings.lemon_squeezy_variant_free and variant_id == settings.lemon_squeezy_variant_free:
        plan = "free"

    # Generate license key
    key = _generate_key(plan)

    # Save to DB
    lic = License(
        key=key,
        email=customer_email,
        plan=plan,
        order_id=order_id,
        is_valid=True,
    )
    db.add(lic)
    db.commit()

    # Send email with license key
    if customer_email:
        send_license_email(customer_email, key, plan)

    return {"received": True, "key": key}


# ── Admin ──────────────────────────────────────────────────────────────────

def _check_admin(x_admin_secret: Optional[str] = Header(None)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(403, "Forbidden - invalid admin secret")


@router.get("/api/admin/licenses")
def admin_list_licenses(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: None = Depends(_check_admin),
):
    total = db.query(License).count()
    items = (
        db.query(License)
        .order_by(License.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "items": [
            {
                "key": l.key,
                "email": l.email,
                "plan": l.plan,
                "is_valid": l.is_valid,
                "jobs_used": l.jobs_used,
                "device_bound": bool(l.device_id),
                "activated_at": l.activated_at.isoformat() if l.activated_at else None,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in items
        ],
    }


@router.get("/api/admin/stats")
def admin_stats(db: Session = Depends(get_db), _: None = Depends(_check_admin)):
    total_licenses = db.query(License).count()
    pro_licenses = db.query(License).filter(License.plan == "pro").count()
    free_licenses = db.query(License).filter(License.plan == "free").count()
    active_licenses = db.query(License).filter(License.is_valid == True).count()
    total_jobs = db.query(Job).count()
    done_jobs = db.query(Job).filter(Job.status == "done").count()
    failed_jobs = db.query(Job).filter(Job.status == "failed").count()

    return {
        "licenses": {
            "total": total_licenses,
            "pro": pro_licenses,
            "free": free_licenses,
            "active": active_licenses,
        },
        "jobs": {
            "total": total_jobs,
            "done": done_jobs,
            "failed": failed_jobs,
        },
        "revenue_estimate": f"${pro_licenses * 29} (@ $29/license)",
    }


@router.post("/api/admin/test-email")
def admin_test_email(
    email: str,
    db: Session = Depends(get_db),
    _: None = Depends(_check_admin),
):
    """Test email sending — returns success/error details."""
    try:
        result = send_license_email(email, "CF-PRO-TEST11-TEST22-TEST33", "pro")
        return {"sent": result, "to": email, "from": settings.email_from, "key_prefix": settings.resend_api_key[:12] if settings.resend_api_key else "not set"}
    except Exception as e:
        return {"sent": False, "error": str(e), "from": settings.email_from, "key_prefix": settings.resend_api_key[:12] if settings.resend_api_key else "not set"}


@router.post("/api/admin/licenses/generate")
def admin_generate_license(
    plan: str = "pro",
    email: str = "",
    db: Session = Depends(get_db),
    _: None = Depends(_check_admin),
):
    """Manually generate a license (for gifting, support, refunds, etc.)."""
    key = _generate_key(plan)
    lic = License(key=key, email=email or None, plan=plan, is_valid=True)
    db.add(lic)
    db.commit()
    if email:
        send_license_email(email, key, plan)
    return {"key": key, "plan": plan, "email": email}


@router.patch("/api/admin/licenses/{key}/disable")
def admin_disable_license(
    key: str,
    db: Session = Depends(get_db),
    _: None = Depends(_check_admin),
):
    lic = db.query(License).filter(License.key == key).first()
    if not lic:
        raise HTTPException(404, "License not found")
    lic.is_valid = False
    db.commit()
    return {"disabled": True}


@router.get("/api/admin/users")
def admin_list_users(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: None = Depends(_check_admin),
):
    total = db.query(User).count()
    items = (
        db.query(User)
        .order_by(User.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "items": [
            {
                "id":              u.id,
                "email":           u.email,
                "name":            u.name,
                "plan":            u.plan,
                "google_linked":   bool(u.google_id),
                "license_key":     u.license_key,
                "is_admin":        u.is_admin,
                "daily_jobs_used": u.daily_jobs_used,
                "daily_jobs_date": u.daily_jobs_date,
                "created_at":      u.created_at.isoformat() if u.created_at else None,
            }
            for u in items
        ],
    }


@router.patch("/api/admin/users/{user_id}/set-pro")
def admin_set_user_pro(
    user_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(_check_admin),
):
    """Manually upgrade a user to pro (for offline payments)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.plan = "pro"
    db.commit()
    return {"upgraded": True, "email": user.email}


@router.patch("/api/admin/licenses/{key}/enable")
def admin_enable_license(
    key: str,
    db: Session = Depends(get_db),
    _: None = Depends(_check_admin),
):
    lic = db.query(License).filter(License.key == key).first()
    if not lic:
        raise HTTPException(404, "License not found")
    lic.is_valid = True
    db.commit()
    return {"enabled": True}
