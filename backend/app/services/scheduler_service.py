from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, func
from redis.asyncio import Redis
from datetime import datetime, timezone
import uuid

from app.core.config import settings
from app.db.session import get_db_context
from app.models.models import Session, SessionStatus, Course, CourseEnrollment, User, AttendanceRecord
from app.services.fcm_service import send_push_notification
from app.services.audit_service import AuditService

async def auto_open_sessions():
    redis = None
    try:
        redis = Redis.from_url(str(settings.REDIS_URL), decode_responses=True)
        async with get_db_context() as db:
            now = datetime.now(tz=timezone.utc)
            q = select(Session, Course.name).join(Course).where(
                Session.status == SessionStatus.PENDING,
                Session.start_time <= now,
                Session.end_time > now
            )
            res = await db.execute(q)
            to_open = res.all()

            for row in to_open:
                session, course_name = row
                session.status = SessionStatus.OPEN

                # Internal session token
                token = str(uuid.uuid4())
                key = f"session:{session.session_id}:token"
                duration = int((session.end_time - now).total_seconds())
                await redis.set(key, token, ex=max(1, duration))

                # FCM to enrolled students
                sq = select(User.fcm_token).join(CourseEnrollment, User.user_id == CourseEnrollment.student_id).where(
                    CourseEnrollment.course_id == session.course_id,
                    User.fcm_token.is_not(None)
                )
                tokens = (await db.execute(sq)).scalars().all()

                if tokens:
                    await send_push_notification(
                        tokens,
                        "Class Started",
                        f"{course_name} has started — tap to check in",
                        {
                            "action": "checkin",
                            "session_id": str(session.session_id),
                            "course_name": course_name,
                            "venue": session.venue_name
                        }
                    )
                await AuditService.log(db, "SYSTEM", "auto_open", "session", str(session.session_id), {"course": course_name})
            await db.commit()
    except Exception as e:
        print(f"auto_open_sessions error: {e}")
    finally:
        if redis: await redis.close()

async def auto_close_sessions():
    redis = None
    try:
        redis = Redis.from_url(str(settings.REDIS_URL), decode_responses=True)
        async with get_db_context() as db:
            now = datetime.now(tz=timezone.utc)
            q = select(Session, Course.name, User.fcm_token).join(Course).join(User, Course.lecturer_id == User.user_id).where(
                Session.status == SessionStatus.OPEN,
                Session.end_time <= now
            )
            res = await db.execute(q)
            to_close = res.all()

            from app.services.attendance_service import AttendanceService

            for row in to_close:
                session, course_name, lecturer_fcm = row
                session.status = SessionStatus.CLOSED
                await redis.delete(f"session:{session.session_id}:token")

                # Finalize pending attendance
                aq = select(AttendanceRecord).where(
                    AttendanceRecord.session_id == session.session_id,
                    AttendanceRecord.departure_time.is_(None)
                )
                pending_records = (await db.execute(aq)).scalars().all()
                for record in pending_records:
                    record.departure_time = session.end_time
                    AttendanceService._calculate_score(record, session)

                if lecturer_fcm:
                    cq = select(func.count(AttendanceRecord.record_id)).where(AttendanceRecord.session_id == session.session_id)
                    count = (await db.execute(cq)).scalar() or 0
                    await send_push_notification(
                        [lecturer_fcm],
                        "Session Closed",
                        f"Session for {course_name} closed. {count} students attended."
                    )
                await AuditService.log(db, "SYSTEM", "auto_close", "session", str(session.session_id), {"course": course_name})
            await db.commit()
    except Exception as e:
        print(f"auto_close_sessions error: {e}")
    finally:
        if redis: await redis.close()

def start_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(auto_open_sessions, "interval", seconds=60)
    scheduler.add_job(auto_close_sessions, "interval", seconds=60)
    scheduler.start()
    return scheduler
