"""
Auth routes:
  POST /api/auth/signup        — email+password signup (new users)
  POST /api/auth/login         — email+password login
  POST /api/auth/google        — Google OAuth login/signup
  GET  /api/auth/me            — get current user
  POST /api/auth/activate      — link pro license key to user account
  POST /api/auth/set-password  — set/update password (for Google users)
"""
import re
import uuid
import os
import hmac
import hashlib
import base64
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


def _hash_password(password: str) -> str:
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return base64.b64encode(salt + key).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    try:
        data = base64.b64decode(hashed.encode("utf-8"))
        salt, key = data[:32], data[32:]
        new_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
        return hmac.compare_digest(key, new_key)
    except Exception:
        return False


# ── Schemas ────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str

class ActivateKeyRequest(BaseModel):
    key: str

class SetPasswordRequest(BaseModel):
    password: str


# ── Helpers ────────────────────────────────────────────────────────────────

def _user_dict(user: User) -> dict:
    return {
        "id":           user.id,
        "email":        user.email,
        "name":         user.name,
        "avatar_url":   user.avatar_url,
        "plan":         user.plan,
        "is_admin":     user.is_admin,
        "has_password": bool(user.password_hash),
    }


def _user_response(user: User, db: Session) -> dict:
    token = create_token(user.id, user.email, user.plan, user.is_admin)
    return {"token": token, "user": _user_dict(user)}


def _find_or_create_google_user(
    db: Session,
    email: str,
    google_id: str,
    name: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> User:
    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()

    if not user:
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
        if google_id and not user.google_id:
            user.google_id = google_id
        if name and not user.name:
            user.name = name
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        if not user.is_admin and settings.admin_email and email == settings.admin_email.lower():
            user.is_admin = True

    db.commit()
    db.refresh(user)
    return user


# ── Routes ─────────────────────────────────────────────────────────────────

@router.post("/signup", status_code=201)
def auth_signup(req: SignupRequest, db: Session = Depends(get_db)):
    """Create new account with email + password."""
    email = req.email.strip().lower()
    if not email or "@" not in email or "." not in email:
        raise HTTPException(400, "Invalid email address")
    if len(req.password.strip()) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if not req.first_name.strip():
        raise HTTPException(400, "First name is required")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(409, "An account with this email already exists. Please sign in.")

    first = req.first_name.strip()
    last  = req.last_name.strip()
    is_admin = bool(settings.admin_email and email == settings.admin_email.lower())

    user = User(
        id=str(uuid.uuid4()),
        email=email,
        first_name=first,
        last_name=last,
        name=f"{first} {last}".strip(),
        password_hash=_hash_password(req.password.strip()),
        plan="free",
        is_admin=is_admin,
    )
    db.add(user)
    db.commit()
    return {"message": "Account created! You can now sign in."}


@router.post("/login")
def auth_login(req: LoginRequest, db: Session = Depends(get_db)):
    """Login with email + password."""
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(401, "No account found with this email. Please sign up first.")

    if not user.password_hash:
        raise HTTPException(
            401,
            "This account was created with Google Sign-In. "
            "Please log in with Google, then set a password from the account settings."
        )

    if not _verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Incorrect password. Please try again.")

    return _user_response(user, db)


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

    user = _find_or_create_google_user(db, email, google_id, name, avatar)
    resp = _user_response(user, db)
    resp["needs_password"] = not bool(user.password_hash)
    return resp


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
        "has_password":     bool(user.password_hash),
    }


@router.post("/set-password")
def auth_set_password(
    req: SetPasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set or update password. Required for Google-only accounts."""
    if len(req.password.strip()) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    user.password_hash = _hash_password(req.password.strip())
    db.commit()
    db.refresh(user)

    token = create_token(user.id, user.email, user.plan, user.is_admin)
    return {
        "token":   token,
        "message": "Password set! You can now sign in with email & password.",
        "user":    {**_user_dict(user), "has_password": True},
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

    existing = db.query(User).filter(User.license_key == key, User.id != user.id).first()
    if existing:
        raise HTTPException(403, "This key is already activated on another account")

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
