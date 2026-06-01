import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import generate_qr_token, verify_qr_signature
from app.models.models import QRToken, QRTokenUsage


class QRService:
    REDIS_KEY = "qr:session:{}"
    REDIS_USED = "qr:used:{}:{}"  # session_id, student_id

    @classmethod
    async def create_token(cls, db: AsyncSession, redis, session) -> str:
        # deactivate old tokens in DB
        await db.execute(update(QRToken).where(QRToken.session_id == session.session_id, QRToken.is_active == True).values(is_active=False))
        await db.flush()

        token_value, ts = generate_qr_token(session.session_id)
        ttl = int(settings.QR_TOKEN_TTL_SECONDS) + 2
        await redis.set(cls.REDIS_KEY.format(session.session_id), token_value, ex=ttl)

        qr = QRToken(
            token_id=str(uuid.uuid4()),
            session_id=session.session_id,
            token_value=token_value,
            issued_at=datetime.now(tz=timezone.utc),
            expires_at=datetime.now(tz=timezone.utc) + timedelta(seconds=ttl),
            is_active=True,
        )
        db.add(qr)
        await db.flush()
        return token_value

    @classmethod
    async def validate_token(cls, redis, token: str, session_id: str, student_id: str):
        # verify signature
        if not verify_qr_signature(token):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR token", headers={"X-Gate-Code": "QR_INVALID"})

        stored = await redis.get(cls.REDIS_KEY.format(session_id))
        if not stored or stored != token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QR token expired or not found", headers={"X-Gate-Code": "QR_EXPIRED"})

        used = await redis.get(cls.REDIS_USED.format(session_id, student_id))
        if used:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="QR token already used by this student", headers={"X-Gate-Code": "ALREADY_CHECKED_IN"})

        return True

    @classmethod
    async def mark_used(cls, db: AsyncSession, redis, token_value: str, session_id: str, student_id: str):
        await redis.set(cls.REDIS_USED.format(session_id, student_id), "1", ex=24 * 3600)
        # find matching QRToken row and insert usage
        result = await db.execute(select(QRToken).where(QRToken.token_value == token_value, QRToken.session_id == session_id))
        qr = result.scalars().first()
        if not qr:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QR token record not found")
        usage = QRTokenUsage(
            usage_id=str(uuid.uuid4()),
            token_id=qr.token_id,
            student_id=student_id,
        )
        db.add(usage)
        await db.flush()
        return usage

    @classmethod
    async def invalidate_session_tokens(cls, db: AsyncSession, redis, session_id: str):
        await redis.delete(cls.REDIS_KEY.format(session_id))
        await db.execute(update(QRToken).where(QRToken.session_id == session_id).values(is_active=False))
        await db.flush()

    @classmethod
    async def get_active_token(cls, redis, session_id: str) -> Optional[str]:
        return await redis.get(cls.REDIS_KEY.format(session_id))

    @classmethod
    async def get_ttl(cls, redis, session_id: str) -> int:
        ttl = await redis.ttl(cls.REDIS_KEY.format(session_id))
        return int(ttl) if ttl is not None else -1
