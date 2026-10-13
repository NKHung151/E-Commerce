import hmac
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from config import settings

security = HTTPBearer(auto_error=False)


def _decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """JWT payload when a token is sent, None for anonymous calls (an invalid token is still a 401)."""
    return _decode_token(credentials.credentials) if credentials else None


async def is_internal_service(x_internal_token: Optional[str] = Header(None)) -> bool:
    """True for service-to-service calls carrying the shared X-Internal-Token."""
    expected = settings.INTERNAL_SERVICE_TOKEN
    return bool(expected and x_internal_token) and hmac.compare_digest(x_internal_token, expected)


def token_user_id(payload: Optional[dict]) -> Optional[int]:
    try:
        return int(payload["user_id"]) if payload else None
    except (KeyError, TypeError, ValueError):
        return None
