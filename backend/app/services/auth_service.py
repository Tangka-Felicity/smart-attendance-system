import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.models import NotificationType, User, UserStatus
from app.services.notification_service import NotificationService


class AuthService:
    @staticmethod
    async def login(db: AsyncSession, redis, email: str, password: str) -> Dict[str, str]:
        q = select(User).where(User.email == email)
        res = await db.execute(q)
        user = res.scalars().first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if user.status != UserStatus.ACTIVE:
            if user.status == UserStatus.SUSPENDED:
                raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="User account suspended")
            status_val = user.status.value if hasattr(user.status, "value") else str(user.status)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"User account is {status_val}")

        from app.core.security import verify_password

        if not verify_password(password, user.password_hash):
            key = f"login:fail:{email}"
            if redis is not None:
                cnt = await redis.incr(key)
                await redis.expire(key, 24 * 3600)
                if int(cnt) >= settings.LOGIN_MAX_ATTEMPTS:
                    await db.execute(update(User).where(User.user_id == user.user_id).values(status=UserStatus.SUSPENDED))
                    await db.flush()
                    await NotificationService.notify_super_admins(db, NotificationType.ANOMALY_DETECTED, f"User {user.email} suspended due to failed logins")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        # reset failed attempts
        if redis is not None:
            await redis.delete(f"login:fail:{email}")

        role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
        access = create_access_token(user.user_id, additional_claims={"role": role_str})
        refresh = create_refresh_token(user.user_id, additional_claims={"role": role_str})
        return {
            "access_token": access,
            "refresh_token": refresh,
            "user": {
                "id": str(user.user_id),
                "name": user.name,
                "email": user.email,
                "role": role_str,
                "status": user.status.value if hasattr(user.status, 'value') else str(user.status),
            },
        }

    @staticmethod
    async def register(db: AsyncSession, redis, payload: Dict) -> Dict[str, str]:
        """Public self-service signup. Creates an ACTIVE STUDENT account and logs them in."""
        import uuid as _uuid

        from app.core.security import hash_password
        from app.models.models import Student, UserRole

        name = (payload.get("name") or "").strip()
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""
        phone = (payload.get("phone") or "").strip()
        # Support both 'student_number' and 'matricule' (mobile uses matricule)
        student_number = (payload.get("student_number") or payload.get("matricule") or "").strip()

        if not (name and email and password and student_number):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing required fields")
        if len(password) < 8:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")

        existing = await db.execute(select(User).where(User.email == email))
        user = existing.scalars().first()

        existing_sn = await db.execute(select(Student).where(Student.student_number == student_number))
        student = existing_sn.scalars().first()

        if user:
            # If user exists, check if they are the same student and haven't registered face
            if student and student.student_id == user.user_id:
                if student.face_profile_id or student.face_embedding:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
                # Allow re-registration if face not registered
                user.name = name
                user.password_hash = hash_password(password)
                if phone:
                    user.phone = phone
            else:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
        else:
            if student:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This matricule is already registered")

            user = User(
                user_id=str(_uuid.uuid4()),
                name=name,
                email=email,
                phone=phone or None,
                password_hash=hash_password(password),
                role=UserRole.STUDENT,
                status=UserStatus.ACTIVE,
                first_login=False,
            )
            db.add(user)
            await db.flush()
            db.add(Student(student_id=user.user_id, student_number=student_number))
            await db.flush()

        role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
        access = create_access_token(user.user_id, additional_claims={"role": role_str})
        refresh = create_refresh_token(user.user_id, additional_claims={"role": role_str})
        return {
            "access_token": access,
            "refresh_token": refresh,
            "user": {
                "id": str(user.user_id),
                "name": user.name,
                "email": user.email,
                "role": role_str,
                "status": user.status.value if hasattr(user.status, "value") else str(user.status),
                "first_login": False,
            },
        }

    @staticmethod
    async def refresh(db: AsyncSession, redis, refresh_token: str) -> Dict[str, str]:
        try:
            payload = decode_token(refresh_token)
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        jti = payload.get("jti")
        if redis is not None and await redis.sismember("token:blocklist", jti):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked")
        # add old jti to blocklist
        exp = int(payload.get("exp", 0))
        ttl = max(0, exp - int(datetime.now(tz=timezone.utc).timestamp()))
        if redis is not None and ttl > 0:
            await redis.sadd("token:blocklist", jti)
            await redis.expire("token:blocklist", ttl)
        subject = payload.get("sub")
        role = payload.get("role")
        new_access = create_access_token(subject, additional_claims={"role": role})
        return {"access_token": new_access}

    @staticmethod
    async def logout(redis, refresh_token: str):
        try:
            payload = decode_token(refresh_token)
        except Exception:
            return True
        jti = payload.get("jti")
        exp = int(payload.get("exp", 0))
        ttl = max(0, exp - int(datetime.now(tz=timezone.utc).timestamp()))
        if redis is not None and ttl > 0:
            await redis.sadd("token:blocklist", jti)
            await redis.expire("token:blocklist", ttl)
        return True
