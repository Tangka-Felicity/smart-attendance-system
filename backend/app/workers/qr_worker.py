from sqlalchemy import select
from redis.asyncio import Redis

from app.core.config import settings
from app.db.session import get_db_context
from app.models.models import Session, SessionStatus
from app.services.qr_service import QRService


async def refresh_all_open_sessions() -> None:
    redis: Redis = None
    try:
        redis = Redis.from_url(str(settings.REDIS_URL), decode_responses=True)
        async with get_db_context() as db:
            q = select(Session).where(Session.status == SessionStatus.OPEN)
            result = await db.execute(q)
            open_sessions = result.scalars().all()
            for session in open_sessions:
                await QRService.create_token(db, redis, session)
    except Exception as exc:
        print(f"refresh_all_open_sessions error: {exc}")
    finally:
        if redis is not None:
            await redis.close()
