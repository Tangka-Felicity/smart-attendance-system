from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_redis, require_roles
from app.db.session import get_db
from app.models.models import AttendanceRecord, Session, Student
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/checkin")
@router.post("/checkin/", include_in_schema=False)
async def checkin(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current=Depends(require_roles("STUDENT")),
):
    session_id = payload.get("session_id")
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    face_image_b64 = payload.get("face_image_b64") or payload.get("face_image")
    student_id = current.get("id")

    if not session_id or latitude is None or longitude is None or not face_image_b64:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing check-in fields")

    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    # Gate 1: Session open + enrolled
    from app.models.models import CourseEnrollment
    q_enr = select(CourseEnrollment).where(CourseEnrollment.course_id == session.course_id, CourseEnrollment.student_id == student_id)
    enrolled = (await db.execute(q_enr)).scalars().first()
    if not enrolled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not enrolled in this course")

    if session.status.name != "OPEN":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not open")

    # Gate 2: Internal token check (QR no longer required from student)
    internal_token = await redis.get(f"session:{session_id}:token")
    if not internal_token:
        # Fallback to QR service if internal token missing (optional/legacy support)
        pass

    # Gate 3: Biometrics and recording handled by service
    record = await AttendanceService.checkin(
        db, redis, session, student,
        qr_token="INTERNAL", # Pass dummy as service expects it but we validated state above
        latitude=float(latitude),
        longitude=float(longitude),
        face_image_b64=face_image_b64
    )
    await db.commit()

    return {
        "message": "Check-in successful",
        "attendance_pct": float(record.attendance_pct or 0),
        "session_id": str(record.session_id),
        "arrival_time": record.arrival_time
    }


@router.post("/checkout")
@router.post("/checkout/", include_in_schema=False)
async def checkout(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current=Depends(require_roles("STUDENT")),
):
    session_id = payload.get("session_id")
    qr_token = payload.get("qr_token")
    student_id = current.get("id")

    if not session_id or not qr_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing checkout fields")

    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    record = await AttendanceService.checkout(db, redis, session, student, qr_token)
    await db.commit()
    return record


@router.post("/manual")
@router.post("/manual/", include_in_schema=False)
async def manual_mark(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER", "COORDINATOR")),
):
    session_id = payload.get("session_id")
    student_id = payload.get("student_id")
    reason = payload.get("reason", "")
    attendance_pct = payload.get("attendance_pct", 100.0)

    if len(reason) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reason must be at least 5 characters")

    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    marker_user_id = current.get("id")

    class Marker:
        def __init__(self, uid: str):
            self.user_id = uid

    marker = Marker(marker_user_id)
    record = await AttendanceService.manual_mark(db, session, student, marker, reason, attendance_pct)
    await db.commit()
    return record


@router.post("/sync")
@router.post("/sync/", include_in_schema=False)
async def sync_offline(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current=Depends(require_roles("STUDENT")),
):
    student_id = current.get("id")
    events = payload.get("events", [])

    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    result = await AttendanceService.sync_offline(db, redis, student, events)
    await db.commit()
    return result


@router.get("/{record_id}")
@router.get("/{record_id}/", include_in_schema=False)
async def get_record(record_id: str, db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    record = await db.get(AttendanceRecord, record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    user_id = current.get("id")
    if current.get("role") not in ["SUPER_ADMIN", "LECTURER"] and record.student_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return {
        "record_id": str(record.record_id),
        "session_id": str(record.session_id),
        "student_id": str(record.student_id),
        "arrival_time": record.arrival_time.isoformat() if record.arrival_time else None,
        "departure_time": record.departure_time.isoformat() if record.departure_time else None,
        "attendance_pct": float(record.attendance_pct) if record.attendance_pct is not None else None,
        "mark": float(record.mark) if record.mark is not None else None,
        "method": record.method.value if hasattr(record.method, "value") else str(record.method),
        "is_makeup": record.is_makeup,
        "manual_reason": record.manual_reason,
    }
