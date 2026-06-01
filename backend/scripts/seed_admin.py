import asyncio
import sys
from pathlib import Path

from sqlalchemy import select

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.security import hash_password
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.models import User, UserRole, UserStatus


async def seed_super_admin() -> None:
    async with AsyncSessionLocal() as db:
        query = select(User).where(User.email == settings.DEFAULT_ADMIN_EMAIL)
        result = await db.execute(query)
        existing = result.scalars().first()
        if existing:
            print(f"Super admin already exists: {settings.DEFAULT_ADMIN_EMAIL}")
            return

        admin = User(
            user_id=settings.DEFAULT_ADMIN_ID,
            name="System Administrator",
            email=settings.DEFAULT_ADMIN_EMAIL,
            password_hash=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
            role=UserRole.SUPER_ADMIN,
            status=UserStatus.ACTIVE,
        )
        db.add(admin)
        await db.commit()
        print(f"Created super admin: {settings.DEFAULT_ADMIN_EMAIL}")


if __name__ == "__main__":
    asyncio.run(seed_super_admin())
