import csv
import io
import uuid
from typing import List

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.core.security import hash_password
from app.db.session import get_db
from app.models.models import NotificationType, Student, User
from app.services.audit_service import AuditService
from app.services.face_service import AzureFaceService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
@router.get("/", include_in_schema=False)
async def list_users(
    role: str = None, # type: ignore
    status: str = None, # type: ignore
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN")),
):
    q = select(User)
    if role:
        q = q.where(User.role == role)
    if status:
        q = q.where(User.status == status)
    q = q.limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()


@router.post("")
@router.post("/", include_in_schema=False)
async def create_user(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER")),
):
    name = payload.get("name")
    email = payload.get("email")
    password = payload.get("password")
    role = payload.get("role")
    if not (name and email and password and role):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing fields")
    password_hash = hash_password(password)
    user = User(user_id=str(uuid.uuid4()), name=name, email=email, password_hash=password_hash, role=role, status="ACTIVE")
    db.add(user)
    await db.flush()
    if role == "STUDENT":
        student_number = (payload.get("student_number") or payload.get("matricule") or "").strip()
        if not student_number:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing student_number or matricule for student")
        student = Student(student_id=user.user_id, student_number=student_number)
        db.add(student)
        await db.flush()
    return user


@router.post("/bulk-csv")
@router.post("/bulk-csv/", include_in_schema=False)
async def bulk_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN")),
):
    content = await file.read()
    stream = io.StringIO(content.decode("utf-8"))
    reader = csv.DictReader(stream)
    created = 0
    for row in reader:
        try:
            name = row.get("name")
            email = row.get("email")
            password = row.get("password")
            student_number = row.get("student_number") or row.get("matricule")
            if not (name and email and password and student_number):
                continue
            user = User(
                user_id=str(uuid.uuid4()),
                name=name,
                email=email,
                password_hash=hash_password(password),
                role="STUDENT",
                status="ACTIVE",
            )
            db.add(user)
            await db.flush()
            student = Student(student_id=user.user_id, student_number=student_number)
            db.add(student)
            await db.flush()
            created += 1
        except Exception:
            continue
    return {"created": created}


@router.get("/{user_id}")
@router.get("/{user_id}/", include_in_schema=False)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    if current.get("role") != "SUPER_ADMIN" and current.get("id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return user


@router.put("/{user_id}")
@router.put("/{user_id}/", include_in_schema=False)
async def update_user(
    user_id: str,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user()),
):
    if current.get("role") != "SUPER_ADMIN" and current.get("id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if "name" in payload:
        user.name = payload["name"]
    if "email" in payload:
        user.email = payload["email"]
    if "phone" in payload:
        user.phone = payload["phone"]
    if "department" in payload:
        user.department = payload["department"]
    if "bio" in payload:
        user.bio = payload["bio"]

    if current.get("role") == "SUPER_ADMIN" and "status" in payload:
        user.status = payload["status"]

    await AuditService.log(db, current.get("id"), "update_user", "user", user_id, payload)
    await db.flush()
    return user


@router.post("/me/avatar/")
@router.post("/me/avatar", include_in_schema=False)
async def update_avatar(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_user()),
):
    user_id = current.get("id")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    avatar_b64 = payload.get("avatar_base64")
    if not avatar_b64:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing avatar_base64")

    user.avatar_base64 = avatar_b64
    await db.flush()
    return {"status": "success"}


@router.post("/me/face/")
@router.post("/me/face", include_in_schema=False)
async def update_me_face(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("STUDENT")),
):
    user_id = current.get("id")
    face_image_b64 = payload.get("face_image_base64") or payload.get("face_image")
    if not face_image_b64:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing face_image_base64")

    student = await db.get(Student, user_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    # Using register_face from FacePlusPlusService (aliased as AzureFaceService)
    face_token = await AzureFaceService.register_face(None, user_id, face_image_b64)
    if face_token:
        student.face_embedding = face_token
        student.face_registered_at = __import__("datetime").datetime.utcnow()
        await db.flush()
        return {"status": "success", "face_token": face_token}

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Face detection failed")


@router.post("/students/{student_id}/face/")
@router.post("/students/{student_id}/face", include_in_schema=False)
async def add_student_face(
    student_id: str,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER")),
):
    course_id = payload.get("course_id")
    face_image_b64 = payload.get("face_image_b64")
    if not course_id or not face_image_b64:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing course_id or face_image_b64")
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    person_id = await AzureFaceService.register_face(course_id, student_id, face_image_b64)
    if person_id:
        student.face_profile_id = person_id
        student.face_registered_at = __import__("datetime").datetime.utcnow()
        await db.flush()
    return {"person_id": person_id}


@router.delete("/students/{student_id}/face/")
@router.delete("/students/{student_id}/face", include_in_schema=False)
async def delete_student_face(
    student_id: str,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN", "LECTURER")),
):
    course_id = payload.get("course_id")
    if not course_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing course_id")
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    person_id = student.face_profile_id
    if person_id:
        await AzureFaceService.delete_face_profile(course_id, person_id)
    student.face_profile_id = None # type: ignore
    student.face_registered_at = None # type: ignore
    await db.flush()
    return {"deleted": True}
