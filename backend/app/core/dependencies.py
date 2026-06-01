from functools import wraps
from typing import Any, Callable, Dict, Iterable, Optional

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis

from app.core.config import settings
from app.core.security import decode_token

_redis_client: Optional[Redis] = None


async def get_redis() -> Optional[Redis]:
    global _redis_client
    try:
        if _redis_client is None:
            _redis_client = Redis.from_url(str(settings.REDIS_URL), decode_responses=True)
        await _redis_client.ping()
        return _redis_client
    except Exception:
        return None


async def _verify_current_user(request: Request, redis: Optional[Redis] = Depends(get_redis)) -> Dict[str, Any]:
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization token")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token identifier")

    if redis is not None:
        try:
            blocked = await redis.sismember("token:blocklist", jti)
            if blocked:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")
        except HTTPException:
            raise
        except Exception:
            pass

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user subject")

    if redis is not None:
        try:
            suspended = await redis.get(f"user:suspended:{user_id}")
            if suspended:
                raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="User account suspended")
        except HTTPException:
            raise
        except Exception:
            pass

    return {
        "id": user_id,
        "role": payload.get("role"),
        "claims": payload,
    }


def get_current_user() -> Callable[[Request], Any]:
    async def dependency(user: Dict[str, Any] = Depends(_verify_current_user)) -> Dict[str, Any]:
        return user

    return dependency


def require_roles(*roles: str) -> Callable[[Dict[str, Any]], Dict[str, Any]]:
    def dependency(user: Dict[str, Any] = Depends(_verify_current_user)) -> Dict[str, Any]:
        if roles and user.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient privileges")
        return user

    return dependency
