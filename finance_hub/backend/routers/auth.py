"""Authentication endpoints for the private Finance Hub area."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import AuthResponse, LoginRequest
from services.auth import SESSION_USER_KEY, authenticate_user, get_current_user


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    """Authenticate the user and persist a signed session cookie."""

    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    request.session.clear()
    request.session[SESSION_USER_KEY] = user.id
    return AuthResponse(user=user)


@router.post("/logout", response_model=dict[str, str], status_code=status.HTTP_200_OK)
def logout(request: Request) -> dict[str, str]:
    """Clear the current authenticated session."""

    request.session.clear()
    return {"status": "ok"}


@router.get("/me", response_model=AuthResponse)
def me(current_user=Depends(get_current_user)) -> AuthResponse:
    """Return the current authenticated user."""

    return AuthResponse(user=current_user)
