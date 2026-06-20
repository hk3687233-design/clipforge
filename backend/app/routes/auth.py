"""
Auth routes:
  POST /api/auth/google   — verify Google credential, return JWT
  POST /api/auth/email    — email-only login/signup (free), return JWT
  GET  /api/auth/me       — get current user
  POST /api/auth/activate — link pro license key to user account
"""
import re
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, User, License
from app.config import settings
from app.services.auth_service import create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

KEY_PATTERN = re.compile(r"^CF-(PRO|FREE)-[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$")


# ── Schemas ────────────────────────────────────────────────────────────────

class GoogleAuthRequest(BaseModel):
    credential: str      # Google ID token (JWT from Google)

class EmailAuthRequest(BaseModel):
    email: str

class ActivateKeyRequest(BaseModel):
    key: str


# ── Helpers ────────────────────────────────────────────────────────────────

def _user_response(user: User, db: Session) -> dict:
    token = create_token(user.id, user.email, user.plan, user.is_admin)
    return {
        "token": token,
        "user": {
            "id":         user.id,
            "email":      user.email,
            "name":       user.name,
            "avatar_url": user.avatar_url,
            "plan":       user.plan,
            "is_admin":   user.is_admin,
        },
    }


def _find_or_create_user(
    db: Session,
    email: str,
    google_id: Optional[str] = None,
    name: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> User:
    # Try by Google ID first, then by email
    user = None
    if google_id:
        user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        # New user
        is_admin = bool(settings.admin_email and email == settings.admin_email.lower())
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            google_id=google_id,
            name=name,
            avatar_url=avatar_url,
            plan="free",
            is_admin=is_admin,
        )
        db.add(user)
    else:
        # Update profile fields if provided
        if google_id:
            user.google_id = google_id
        if name:
            user.name = name
        if avatar_url:
            user.avatar_url = avatar_url
        if not user.is_admin and settings.admin_email and email == settings.admin_email.lower():
            user.is_admin = True

    db.commit()
    db.refresh(user)
    return user


# ── Routes ─────────────────────────────────────────────────────────────────

@router.post("/google")
def auth_google(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Verify Google ID token, create/find user, return JWT."""
    if not settings.google_client_id:
        raise HTTPException(503, "Google auth not configured on server")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        id_info = id_token.verify_oauth2_token(
            req.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except Exception as e:
        raise HTTPException(401, f"Invalid Google credential: {str(e)[:100]}")

    google_id = id_info.get("sub", "")
    email     = id_info.get("email", "").strip().lower()
    name      = id_info.get("name", "")
    avatar    = id_info.get("picture", "")

    if not email or not google_id:
        raise HTTPException(401, "Google token missing email or sub")

    user = _find_or_create_user(db, email, google_id, name, avatar)
    return _user_response(user, db)


@router.post("/email")
def auth_email(req: EmailAuthRequest, db: Session = Depends(get_db)):
    """Email-only signup/login (no password — free plan by default)."""
    email = req.email.strip().lower()
    if not email or "@" not in email or "." not in email:
        raise HTTPException(400, "Invalid email address")

    user = _find_or_create_user(db, email)
    return _user_response(user, db)


@router.get("/me")
def auth_me(user: User = Depends(get_current_user)):
    """Return current authenticated user."""
    return {
        "id":               user.id,
        "email":            user.email,
        "name":             user.name,
        "avatar_url":       user.avatar_url,
        "plan":             user.plan,
        "is_admin":         user.is_admin,
        "daily_jobs_used":  user.daily_jobs_used,
        "daily_jobs_date":  user.daily_jobs_date,
    }


@router.post("/activate")
def activate_key(
    req: ActivateKeyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Link a pro license key to the current user → upgrades plan to pro."""
    key = req.key.strip().upper()
    if not KEY_PATTERN.match(key):
        raise HTTPException(400, "Invalid license key format")

    lic = db.query(License).filter(License.key == key).first()
    if not lic:
        raise HTTPException(404, "License key not found — check and try again")
    if not lic.is_valid:
        raise HTTPException(403, "This license key has been disabled")

    # Prevent key sharing — one key per account only
    existing = db.query(User).filter(User.license_key == key, User.id != user.id).first()
    if existing:
        raise HTTPException(403, "This key is already activated on another account")

    # Link key to user and upgrade plan
    user.license_key = key
    user.plan = lic.plan
    if not lic.activated_at:
        lic.activated_at = datetime.utcnow()
    if not lic.email:
        lic.email = user.email
    db.commit()

    token = create_token(user.id, user.email, user.plan, user.is_admin)
    return {
        "token":   token,
        "plan":    user.plan,
        "message": f"Activated — you now have {user.plan.upper()} access!",
    }
