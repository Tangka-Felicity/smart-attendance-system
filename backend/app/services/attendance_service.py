import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    AttendanceRecord,
    CourseEnrollment,
    NotificationType,
    Session,
    Student,
)
from app.services.audit_service import AuditService
from app.services.face_service import FaceIdentifyResult, AzureFaceService
from app.services.notification_service import NotificationService
from app.services.qr_service import QRService
from app.utils.haversine import haversine_metres


class AttendanceService:
    @staticmethod
    async def checkin(
        db: AsyncSession,
        redis,
        session: Session,
        student: Student,
        qr_token: str,
        latitude: float,
        longitude: float,
        face_image_b64: str,
    ) -> AttendanceRecord:
        q = select(CourseEnrollment).where(
            CourseEnrollment.student_id == student.student_id,
            CourseEnrollment.course_id == session.course_id,
        )
        res = await db.execute(q)
        if not res.scalars().first():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student not enrolled for course")

        if session.status.name != "OPEN":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session not open")

        q2 = select(AttendanceRecord).where(
            AttendanceRecord.session_id == session.session_id,
            AttendanceRecord.student_id == student.student_id,
        )
        res2 = await db.execute(q2)
        if res2.scalars().first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already checked in")

        await QRService.validate_token(redis, qr_token, session.session_id, student.student_id)

        dist = haversine_metres(float(latitude), float(longitude), float(session.latitude), float(session.longitude))
        if dist > float(session.geofence_radius):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Geofence failed",
                headers={"X-Gate-Code": "GEOFENCE_FAIL", "X-Gate-Distance": str(dist)},
            )

        face_result: FaceIdentifyResult = await AzureFaceService.identify_face(session.course_id, face_image_b64)
        if not face_result.matched:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Face not matched",
                headers={"X-Gate-Code": "FACE_NO_MATCH"},
            )
        if student.face_profile_id and face_result.person_id and student.face_profile_id != face_result.person_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Face profile mismatch")

        await QRService.mark_used(db, redis, qr_token, session.session_id, student.student_id)

        now = datetime.now(tz=timezone.utc)
        record = AttendanceRecord(
            record_id=str(uuid.uuid4()),
            session_id=session.session_id,
            student_id=student.student_id,
            arrival_time=now,
            effective_arrival=now,
            method="AUTO",
        )
        db.add(record)
        await db.flush()

        await NotificationService.send(db, student.student_id, NotificationType.CHECKIN_CONFIRMED, "Check-in confirmed")
        return record

    @staticmethod
    async def checkout(
        db: AsyncSession,
        redis,
        session: Session,
        student: Student,
        qr_token: str,
    ) -> AttendanceRecord:
        await QRService.validate_token(redis, qr_token, session.session_id, student.student_id)

        q = select(AttendanceRecord).where(
            AttendanceRecord.session_id == session.session_id,
            AttendanceRecord.student_id == student.student_id,
        )
        res = await db.execute(q)
        record = res.scalars().first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No attendance record")

        now = datetime.now(tz=timezone.utc)
        record.departure_time = now
        AttendanceService._calculate_score(record, session)
        await db.flush()

        await NotificationService.send(db, student.student_id, NotificationType.EARLY_DEPARTURE, "Early departure recorded")
        return record

    @staticmethod
    def _calculate_score(record: AttendanceRecord, session: Session) -> None:
        if not record.arrival_time:
            record.attendance_pct = 0
            record.mark = 0
            return

        start = session.start_time
        end = session.end_time
        session_duration = (end - start).total_seconds()
        arrival = record.effective_arrival or record.arrival_time
        departure = record.departure_time or end
        attended = max(0.0, (departure - arrival).total_seconds())
        pct = max(0.0, min(100.0, (attended / session_duration) * 100.0)) if session_duration > 0 else 0.0
        record.attendance_pct = round(pct, 2)
        record.mark = round(max(0.0, min(10.0, (pct * 10.0) / 100.0)), 2)

    @staticmethod
    async def manual_mark(
        db: AsyncSession,
        session: Session,
        student: Student,
        marker: Any,
        reason: str,
        attendance_pct: float = 100.0,
    ) -> AttendanceRecord:
        q = select(func.count(AttendanceRecord.record_id)).where(
            AttendanceRecord.session_id == session.session_id,
            AttendanceRecord.manual_marker_id == marker.user_id,
        )
        res = await db.execute(q)
        count = res.scalar() or 0
        if count >= 3:
            await NotificationService.notify_super_admins(
                db,
                NotificationType.COORDINATOR_LIMIT_EXCEEDED,
                f"Coordinator {marker.user_id} exceeded manual mark cap for session {session.session_id}",
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Coordinator cap reached")

        q2 = select(AttendanceRecord).where(
            AttendanceRecord.session_id == session.session_id,
            AttendanceRecord.student_id == student.student_id,
        )
        existing = await db.execute(q2)
        if existing.scalars().first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attendance already exists")

        now = datetime.now(tz=timezone.utc)
        rec = AttendanceRecord(
            record_id=str(uuid.uuid4()),
            session_id=session.session_id,
            student_id=student.student_id,
            arrival_time=now,
            effective_arrival=now,
            departure_time=now,
            attendance_pct=attendance_pct,
            mark=round(max(0.0, min(10.0, (attendance_pct * 10.0 / 100.0))), 2),
            method="MANUAL",
            manual_marker_id=marker.user_id,
            manual_reason=reason,
        )
        db.add(rec)
        await db.flush()

        await AuditService.log(
            db,
            marker.user_id,
            "manual_mark",
            "attendance",
            rec.record_id,
            {"reason": reason, "attendance_pct": attendance_pct},
        )
        return rec

    @staticmethod
    async def sync_offline(
        db: AsyncSession,
        redis,
        student: Student,
        events: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        synced = 0
        failed: List[Dict[str, Any]] = []
        for ev in events:
            try:
                session_id = ev.get("session_id") or ev.get("session")
                if not session_id:
                    raise ValueError("Missing session_id")

                session = await db.get(Session, session_id)
                if not session:
                    raise ValueError("Session not found")

                if ev.get("type") == "checkin":
                    await AttendanceService.checkin(
                        db,
                        redis,
                        session,
                        student,
                        ev["qr_token"],
                        float(ev["latitude"]),
                        float(ev["longitude"]),
                        ev.get("face_image_b64", ""),
                    )
                elif ev.get("type") == "checkout":
                    await AttendanceService.checkout(db, redis, session, ev["qr_token"])
                synced += 1
            except Exception as exc:
                failed.append({"event": ev, "error": str(exc)})
        return {"synced": synced, "failed": failed}
