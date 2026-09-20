from fastapi import Depends, HTTPException, status
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


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = credentials.credentials
    payload = _decode_token(token)
    return payload


def require_roles(*allowed_roles):
    async def _require(payload: dict = Depends(get_current_user)):
        role = payload.get("role") or payload.get("roles") or payload.get("role_name")
        if role is None:
            raise HTTPException(status_code=403, detail="Missing role in token")
        # Allow passing single or list
        if isinstance(role, list):
            if not any(r in allowed_roles for r in role):
                raise HTTPException(status_code=403, detail="Forbidden")
        else:
            if role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Forbidden")
        return payload
    return _require
