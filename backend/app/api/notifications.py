from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
async def list_notifications(
    limit: int = Query(50, gt=0),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user()),
):
    user_id = current.get("id")
    q = select(Notification).where(Notification.recipient_id == user_id).order_by(Notification.sent_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    notifications = res.scalars().all()
    q2 = select(Notification).where(Notification.recipient_id == user_id, Notification.read_at == None)
    res2 = await db.execute(q2)
    unread_count = len(res2.scalars().all())
    return {"notifications": notifications, "unread_count": unread_count}


@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user()),
):
    notif = await db.get(Notification, notification_id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if notif.recipient_id != current.get("id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    notif.read_at = datetime.now(tz=timezone.utc)
    await db.flush()
    return notif
