import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], bcrypt__rounds=12, deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _now_utc() -> datetime:
    return datetime.now(tz=timezone.utc)


def create_access_token(subject: str, additional_claims: Optional[Dict[str, str]] = None) -> str:
    expire = _now_utc() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "type": "access",
        "jti": str(uuid.uuid4()),
    }
    if additional_claims:
        payload.update({k: str(v) if isinstance(v, (uuid.UUID,)) else v for k, v in additional_claims.items()})
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str, additional_claims: Optional[Dict[str, str]] = None) -> str:
    expire = _now_utc() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
    }
    if additional_claims:
        payload.update({k: str(v) if isinstance(v, (uuid.UUID,)) else v for k, v in additional_claims.items()})
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, str]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise ValueError("Token decode failed") from exc


def generate_qr_token(session_id: str, timestamp: Optional[int] = None) -> Tuple[str, int]:
    timestamp = timestamp or int(_now_utc().timestamp())
    raw = f"{session_id}:{timestamp}"
    signature = hmac.new(
        settings.QR_HMAC_SECRET.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    token = f"{raw}:{signature}"
    return token, timestamp


def verify_qr_signature(token: str) -> bool:
    try:
        session_id, timestamp_str, signature = token.rsplit(":", 2)
    except ValueError:
        return False
    raw = f"{session_id}:{timestamp_str}"
    expected = hmac.new(
        settings.QR_HMAC_SECRET.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
