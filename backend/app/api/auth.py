from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_redis, get_current_user
from app.models.models import User
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
@router.post("/login/", include_in_schema=False)
async def login(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    email = payload.get("email")
    password = payload.get("password")
    if not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing credentials")
    return await AuthService.login(db, redis, email, password)


@router.post("/register", status_code=status.HTTP_201_CREATED)
@router.post("/register/", status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def register(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    return await AuthService.register(db, redis, payload)


@router.post("/refresh")
@router.post("/refresh/", include_in_schema=False)
async def refresh(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    token = payload.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh token")
    return await AuthService.refresh(db, redis, token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
@router.post("/logout/", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=False)
async def logout(
    payload: dict = Body(...),
    redis=Depends(get_redis),
):
    token = payload.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh token")
    await AuthService.logout(redis, token)
    return None


@router.get("/me")
@router.get("/me/", include_in_schema=False)
async def me(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user()),
):
    user_id = user.get("id")
    query = select(User).where(User.user_id == user_id)
    result = await db.execute(query)
    current_user = result.scalars().first()
    if not current_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {
        "id": str(current_user.user_id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        "status": current_user.status.value if hasattr(current_user.status, 'value') else str(current_user.status),
        "first_login": current_user.first_login,
    }


@router.post("/first-login-change-password")
@router.post("/first-login-change-password/", include_in_schema=False)
async def first_login_change_password(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user()),
):
    user_id = user.get("id")
    new_password = payload.get("new_password")
    confirm_password = payload.get("confirm_password")

    if not new_password or not confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing password fields")

    if new_password != confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")

    if len(new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")

    query = select(User).where(User.user_id == user_id)
    result = await db.execute(query)
    current_user = result.scalars().first()

    if not current_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not current_user.first_login:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a first login")

    from app.core.security import hash_password
    current_user.password_hash = hash_password(new_password)
    current_user.first_login = False
    await db.commit()

    return {"status": "success", "message": "Password updated successfully"}
