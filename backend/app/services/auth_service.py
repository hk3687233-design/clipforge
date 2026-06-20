"""JWT utilities and auth dependency."""
import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Header, Depends
from sqlalchemy.orm import Session
from app.database import get_db, User
from app.config import settings


def create_token(user_id: str, email: str, plan: str, is_admin: bool = False) -> str:
    exp = datetime.utcnow() + timedelta(days=30)
    payload = {
        "sub": user_id,
        "email": email,
        "plan": plan,
        "admin": is_admin,
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired — please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid session token")


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_token(token)
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(401, "User not found — please log in again")
    return user


def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Admin access required")
    return user
