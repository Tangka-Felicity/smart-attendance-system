import uuid
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.models import AttendanceRecord, Course, CourseEnrollment, NotificationType, Session, Student, User
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


@router.get("/available/")
@router.get("/available", include_in_schema=False)
async def list_available_courses(db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    user_id = current.get("id")
    # Subquery for courses the student is already enrolled in
    enrolled_sub = select(CourseEnrollment.course_id).where(CourseEnrollment.student_id == user_id)

    # Query for courses NOT in that list
    q = (
        select(
            Course,
            User.name.label("lecturer_name"),
            func.count(CourseEnrollment.enrollment_id).label("total_students"),
            func.count(Session.session_id).label("total_sessions")
        )
        .join(User, Course.lecturer_id == User.user_id)
        .outerjoin(CourseEnrollment, Course.course_id == CourseEnrollment.course_id)
        .outerjoin(Session, Course.course_id == Session.course_id)
        .where(Course.course_id.not_in(enrolled_sub))
        .group_by(Course.course_id, User.name)
    )

    res = await db.execute(q)
    results = []
    for row in res.all():
        course = row[0]
        results.append({
            "course_id": str(course.course_id),
            "name": course.name,
            "code": course.code,
            "semester": course.semester,
            "academic_year": course.academic_year,
            "lecturer_name": row.lecturer_name,
            "total_students": row.total_students,
            "total_sessions": row.total_sessions
        })
    return results


@router.get("/my/")
@router.get("/my", include_in_schema=False)
async def list_my_courses(db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    user_id = current.get("id")

    # Get courses student is enrolled in
    q = (
        select(
            Course,
            User.name.label("lecturer_name"),
            func.count(CourseEnrollment.enrollment_id).label("total_students"),
            func.count(Session.session_id).label("total_sessions")
        )
        .join(User, Course.lecturer_id == User.user_id)
        .join(CourseEnrollment, Course.course_id == CourseEnrollment.course_id)
        .outerjoin(Session, Course.course_id == Session.course_id)
        .where(CourseEnrollment.student_id == user_id)
        .group_by(Course.course_id, User.name)
    )

    res = await db.execute(q)
    results = []
    for row in res.all():
        course = row[0]
        # Calculate attendance percentage for this course
        att_q = select(func.avg(AttendanceRecord.attendance_pct)).where(
            AttendanceRecord.student_id == user_id,
            AttendanceRecord.session_id.in_(select(Session.session_id).where(Session.course_id == course.course_id))
        )
        att_res = await db.execute(att_q)
        avg_att = att_res.scalar() or 0.0

        results.append({
            "course_id": str(course.course_id),
            "name": course.name,
            "code": course.code,
            "semester": course.semester,
            "academic_year": course.academic_year,
            "lecturer_name": row.lecturer_name,
            "total_students": row.total_students,
            "total_sessions": row.total_sessions,
            "attendance_percentage": float(avg_att)
        })
    return results


@router.post("/{course_id}/enroll/")
@router.post("/{course_id}/enroll", include_in_schema=False)
async def self_enroll(course_id: str, db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    user_id = current.get("id")

    # Check if already enrolled
    q = select(CourseEnrollment).where(CourseEnrollment.course_id == course_id, CourseEnrollment.student_id == user_id)
    res = await db.execute(q)
    if res.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already enrolled")

    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    enrollment = CourseEnrollment(enrollment_id=str(uuid.uuid4()), student_id=user_id, course_id=course_id)
    db.add(enrollment)
    await db.flush()
    await db.commit()

    return {
        "message": "Enrolled successfully",
        "course_id": course_id,
        "course_name": course.name
    }


@router.delete("/{course_id}/enroll/")
@router.delete("/{course_id}/enroll", include_in_schema=False)
async def self_unenroll(course_id: str, db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    user_id = current.get("id")
    q = select(CourseEnrollment).where(CourseEnrollment.course_id == course_id, CourseEnrollment.student_id == user_id)
    res = await db.execute(q)
    enrollment = res.scalars().first()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    await db.delete(enrollment)
    await db.commit()
    return {"message": "Unenrolled successfully"}


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
