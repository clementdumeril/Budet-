"""Authentication, password hashing and session dependencies."""

from __future__ import annotations

import hashlib
import hmac
import secrets

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import get_db
from backend.models import User


PBKDF2_ROUNDS = 310_000
SESSION_USER_KEY = "user_id"


def hash_password(password: str) -> str:
    """Hash a password using salted PBKDF2-HMAC-SHA256."""

    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${PBKDF2_ROUNDS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against the stored PBKDF2 hash."""

    try:
        algorithm, rounds_str, salt_hex, digest_hex = password_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        int(rounds_str),
    )
    return hmac.compare_digest(derived.hex(), digest_hex)


def bootstrap_initial_admin(db: Session) -> None:
    """Ensure the configured admin user exists for local startup."""

    settings = get_settings()
    if not settings.bootstrap_admin:
        return

    existing_admin = db.scalar(select(User.id).where(User.email == settings.admin_email.strip().lower()))
    if existing_admin is not None:
        return

    admin = User(
        email=settings.admin_email.strip().lower(),
        password_hash=hash_password(settings.admin_password),
        full_name=settings.admin_name,
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Authenticate a user by email and password."""

    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def _get_local_bypass_user(db: Session) -> User | None:
    """Return the local single-user profile when auth bypass is enabled."""

    settings = get_settings()
    preferred_email = settings.admin_email.strip().lower()
    preferred_user = db.scalar(select(User).where(User.email == preferred_email, User.is_active.is_(True)))
    if preferred_user is not None:
        return preferred_user
    return db.scalar(select(User).where(User.is_active.is_(True)).order_by(User.created_at.asc()))


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Return the authenticated user from the signed session cookie."""

    settings = get_settings()
    user_id = request.session.get(SESSION_USER_KEY)
    if user_id is None:
        if settings.local_auth_bypass and not settings.is_production:
            bypass_user = _get_local_bypass_user(db)
            if bypass_user is not None:
                return bypass_user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        request.session.clear()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    return user


def require_editor_user(current_user: User = Depends(get_current_user)) -> User:
    """Restrict write operations to admin users."""

    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return current_user
