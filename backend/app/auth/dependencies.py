from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth.security import decode_access_token
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")

_credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError as exc:
        raise _credentials_exception from exc

    raw_user_id = payload.get("sub")
    if raw_user_id is None:
        raise _credentials_exception

    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError) as exc:
        raise _credentials_exception from exc

    user = db.scalars(
        select(User).options(joinedload(User.role)).where(User.id == user_id)
    ).first()

    if user is None or not user.is_active:
        raise _credentials_exception

    return user


def require_role(*allowed_roles: str) -> Callable[..., User]:
    """Dependency factory restricting an endpoint to specific role names,
    e.g. Depends(require_role("Admin")) or Depends(require_role("Admin", "Finance Manager")).
    Role names are matched case-insensitively against roles.name.
    """
    normalized = {role.strip().casefold() for role in allowed_roles}

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name.strip().casefold() not in normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return dependency
