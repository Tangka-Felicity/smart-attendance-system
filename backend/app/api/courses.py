import uuid
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.models import Course, CourseEnrollment, NotificationType, Student, User
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("")
@router.get("/", include_in_schema=False)
async def list_courses(db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    role = current.get("role")
    user_id = current.get("id")
    q = select(Course)
    if role == "LECTURER":
        q = q.where(Course.lecturer_id == user_id)
    elif role == "STUDENT":
        q = q.join(CourseEnrollment).where(CourseEnrollment.student_id == user_id)
    elif role != "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    res = await db.execute(q)
    return res.scalars().all()


@router.post("")
@router.post("/", include_in_schema=False)
async def create_course(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER")),
):
    name = payload.get("name")
    code = payload.get("code")
    semester = payload.get("semester")
    academic_year = payload.get("academic_year")
    lecturer_id = current.get("id")
    if not (name and code and semester and academic_year):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing fields")
    course = Course(
        course_id=str(uuid.uuid4()),
        name=name,
        code=code,
        lecturer_id=lecturer_id,
        semester=semester,
        academic_year=academic_year,
    )
    db.add(course)
    await db.flush()
    return course


@router.get("/{course_id}/students")
@router.get("/{course_id}/students/", include_in_schema=False)
async def course_students(course_id: str, db: AsyncSession = Depends(get_db), current=Depends(require_roles("SUPER_ADMIN", "LECTURER"))):
    q = select(Student).join(CourseEnrollment).where(CourseEnrollment.course_id == course_id)
    res = await db.execute(q)
    students = res.scalars().all()
    return [{"student": s, "face_registered": bool(s.face_profile_id)} for s in students]


@router.post("/{course_id}/enroll")
@router.post("/{course_id}/enroll/", include_in_schema=False)
async def enroll_students(
    course_id: str,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER")),
):
    student_ids: List[str] = payload.get("student_ids", [])
    added = 0
    for sid in student_ids:
        student = await db.get(Student, sid)
        if not student:
            continue
        q = select(CourseEnrollment).where(CourseEnrollment.course_id == course_id, CourseEnrollment.student_id == sid)
        res = await db.execute(q)
        if res.scalars().first():
            continue
        enrollment = CourseEnrollment(enrollment_id=str(uuid.uuid4()), student_id=sid, course_id=course_id)
        db.add(enrollment)
        added += 1
    await db.flush()
    return {"added": added}


@router.delete("/{course_id}/enroll/{student_id}")
@router.delete("/{course_id}/enroll/{student_id}/", include_in_schema=False)
async def remove_enrollment(
    course_id: str,
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER")),
):
    q = select(CourseEnrollment).where(CourseEnrollment.course_id == course_id, CourseEnrollment.student_id == student_id)
    res = await db.execute(q)
    enrollment = res.scalars().first()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await db.delete(enrollment)
    await db.flush()
    return {"removed": True}
