from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_redis, require_roles
from app.db.session import get_db
from app.models.models import AttendanceRecord, Session, Student
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/checkin")
async def checkin(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current=Depends(require_roles("STUDENT")),
):
    session_id = payload.get("session_id")
    qr_token = payload.get("qr_token")
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    face_image_b64 = payload.get("face_image_b64")
    student_id = current.get("id")

    if not session_id or not qr_token or latitude is None or longitude is None or not face_image_b64:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing check-in fields")

    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    if not student.face_profile_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Face profile not registered")

    record = await AttendanceService.checkin(db, redis, session, student, qr_token, float(latitude), float(longitude), face_image_b64)
    await db.commit()
    return record


@router.post("/checkout")
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
async def get_record(record_id: str, db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    record = await db.get(AttendanceRecord, record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    user_id = current.get("id")
    if current.get("role") not in ["SUPER_ADMIN", "LECTURER"] and record.student_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return record
