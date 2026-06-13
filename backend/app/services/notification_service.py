import json
from typing import Optional

from google.oauth2 import service_account
from google.auth.transport.requests import Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import Notification, NotificationType, User, AttendanceRecord
from app.utils.http_client import HTTPClient


class NotificationService:
    FCM_URL = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"

    @classmethod
    async def send(cls, db: AsyncSession, recipient_id: str, notif_type: NotificationType, message: str):
        notif = Notification(
            notification_id=str(__import__("uuid").uuid4()),
            recipient_id=recipient_id,
            type=notif_type,
            message=message,
        )
        db.add(notif)
        await db.flush()

        try:
            if not settings.FCM_PROJECT_ID or not settings.FCM_SERVICE_ACCOUNT_JSON:
                return notif

            recipient = await db.get(User, recipient_id)
            if not recipient or not recipient.fcm_token:
                return notif

            creds = service_account.Credentials.from_service_account_file(
                settings.FCM_SERVICE_ACCOUNT_JSON,
                scopes=["https://www.googleapis.com/auth/firebase.messaging"],
            )
            creds.refresh(Request())
            access_token = creds.token

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; UTF-8",
            }
            payload = {
                "message": {
                    "token": recipient.fcm_token,
                    "notification": {"title": "Smart Attendance", "body": message},
                    "data": {"type": notif_type.value},
                }
            }
            url = cls.FCM_URL.format(project_id=settings.FCM_PROJECT_ID)
            # Optimization: Use shared HTTP client to reuse connections
            client = await HTTPClient.get_client()
            await client.post(url, headers=headers, json=payload, timeout=15.0)
        except Exception:
            pass

        return notif

    @classmethod
    async def notify_super_admins(cls, db: AsyncSession, notif_type: NotificationType, message: str):
        q = select(User).where(User.role == "SUPER_ADMIN", User.status == "ACTIVE")
        result = await db.execute(q)
        admins = result.scalars().all()
        for admin in admins:
            await cls.send(db, admin.user_id, notif_type, message)

    @classmethod
    async def evaluate_threshold(cls, db: AsyncSession, student_user_id: str, student_name: str, lecturer_user_id: Optional[str]):
        q = select(func.avg(AttendanceRecord.attendance_pct)).where(AttendanceRecord.student_id == student_user_id)
        result = await db.execute(q)
        avg = float(result.scalar() or 0)
        if 60 <= avg < 80:
            msg = f"Student {student_name} average attendance is {avg:.2f}%. Issue: Warning threshold."
            await cls.send(db, student_user_id, NotificationType.WARNING_THRESHOLD, msg)
            if lecturer_user_id:
                await cls.send(db, lecturer_user_id, NotificationType.WARNING_THRESHOLD, msg)
        elif avg < 60:
            msg = f"Student {student_name} average attendance is {avg:.2f}%. Issue: At-risk threshold."
            await cls.send(db, student_user_id, NotificationType.AT_RISK_THRESHOLD, msg)
            if lecturer_user_id:
                await cls.send(db, lecturer_user_id, NotificationType.AT_RISK_THRESHOLD, msg)
        return avg
