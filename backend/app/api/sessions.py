import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_redis, require_roles
from app.db.session import get_db
from app.models.models import AttendanceRecord, CourseEnrollment, NotificationType, Session, Student
from app.services.notification_service import NotificationService
from app.services.qr_service import QRService

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _parse_datetime(value: str, field_name: str) -> datetime:
    if not value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Missing {field_name}")
    try:
        # Handle JS toISOString() which ends with 'Z'
        if isinstance(value, str) and value.endswith("Z"):
            value = value.replace("Z", "+00:00")
        return datetime.fromisoformat(value)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {field_name} format: {value}")


@router.get("")
@router.get("/", include_in_schema=False)
async def list_sessions(
    course_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user()),
):
    q = select(Session)
    if course_id:
        q = q.where(Session.course_id == course_id)
    if status_filter:
        q = q.where(Session.status == status_filter)
    res = await db.execute(q)
    return res.scalars().all()


@router.post("")
@router.post("/", include_in_schema=False)
async def create_session(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER", "COORDINATOR")),
):
    course_id = payload.get("course_id")
    start_time = _parse_datetime(payload.get("start_time"), "start_time") # type: ignore
    end_time = _parse_datetime(payload.get("end_time"), "end_time") # type: ignore
    venue_name = payload.get("venue_name")
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")

    # Coerce latitude/longitude to float if they are strings
    try:
        if latitude is not None:
            latitude = float(latitude)
        if longitude is not None:
            longitude = float(longitude)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Latitude and longitude must be numbers")

    if not (course_id and venue_name and latitude is not None and longitude is not None):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing fields")
    if end_time <= start_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_time must be after start_time")
    session = Session(
        session_id=str(uuid.uuid4()),
        course_id=course_id,
        coordinator_id=current.get("id"),
        start_time=start_time,
        end_time=end_time,
        venue_name=venue_name,
        latitude=latitude,
        longitude=longitude,
        geofence_radius=payload.get("geofence_radius", 50),
        grace_period=payload.get("grace_period", 15),
        category=payload.get("category", "REGULAR"),
    )
    db.add(session)
    await db.flush()
    return session


@router.get("/{session_id}")
@router.get("/{session_id}/", include_in_schema=False)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return session


@router.put("/{session_id}")
@router.put("/{session_id}/", include_in_schema=False)
async def update_session(
    session_id: str,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER")),
):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if session.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only update PENDING sessions")
    for field, value in payload.items():
        if field in {"course_id", "coordinator_id", "start_time", "end_time", "venue_name", "latitude", "longitude", "geofence_radius", "grace_period", "category", "status"}:
            if field in {"start_time", "end_time"} and value is not None:
                parsed = _parse_datetime(value, field)
                setattr(session, field, parsed)
            else:
                setattr(session, field, value)
    await db.flush()
    return session


@router.post("/{session_id}/announce")
@router.post("/{session_id}/announce/", include_in_schema=False)
async def announce_session(
    session_id: str,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER")),
):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    q = select(CourseEnrollment).where(CourseEnrollment.course_id == session.course_id)
    res = await db.execute(q)
    enrollments = res.scalars().all()
    message = payload.get("message", f"Session announced: {session.venue_name}")
    for enrollment in enrollments:
        await NotificationService.send(db, enrollment.student_id, NotificationType.SESSION_ANNOUNCED, message)
    return {"sent": len(enrollments)}


@router.post("/{session_id}/open")
@router.post("/{session_id}/open/", include_in_schema=False)
async def open_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER")),
):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    session.status = "OPEN" # type: ignore
    await db.flush()
    token = await QRService.create_token(db, redis, session)
    ttl = await QRService.get_ttl(redis, session_id)
    return {"status": "OPEN", "qr_token": token, "ttl_seconds": ttl}


@router.post("/{session_id}/close")
@router.post("/{session_id}/close/", include_in_schema=False)
async def close_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER")),
):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await QRService.invalidate_session_tokens(db, redis, session_id)
    q = select(AttendanceRecord).where(AttendanceRecord.session_id == session_id, AttendanceRecord.departure_time == None)
    res = await db.execute(q)
    unchecked = res.scalars().all()
    for record in unchecked:
        record.departure_time = session.end_time
    await db.flush()
    session.status = "CLOSED" # type: ignore
    await db.flush()
    q2 = select(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
    res2 = await db.execute(q2)
    records = res2.scalars().all()
    return {"status": "CLOSED", "attendance_count": len(records)}


@router.get("/{session_id}/qr")
@router.get("/{session_id}/qr/", include_in_schema=False)
async def get_qr(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER")),
):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    token = await QRService.get_active_token(redis, session_id)
    if not token:
        token = await QRService.create_token(db, redis, session)
    ttl = await QRService.get_ttl(redis, session_id)
    return {"qr_token": token, "ttl_seconds": ttl}


@router.get("/{session_id}/attendance")
@router.get("/{session_id}/attendance/", include_in_schema=False)
async def get_attendance(session_id: str, db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    q = select(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
    res = await db.execute(q)
    records = res.scalars().all()
    return [
        {
            "record_id": str(r.record_id),
            "session_id": str(r.session_id),
            "student_id": str(r.student_id),
            "arrival_time": r.arrival_time.isoformat() if r.arrival_time else None,
            "departure_time": r.departure_time.isoformat() if r.departure_time else None,
            "attendance_pct": float(r.attendance_pct) if r.attendance_pct is not None else None,
            "mark": float(r.mark) if r.mark is not None else None,
            "method": r.method.value if hasattr(r.method, "value") else str(r.method),
            "is_makeup": r.is_makeup,
            "manual_reason": r.manual_reason,
        }
        for r in records
    ]
