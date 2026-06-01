import uuid
from datetime import datetime
from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import AuditLog


class AuditService:
    @staticmethod
    async def log(db: AsyncSession, actor_id: str, action_type: str, entity_type: str, entity_id: str, details_dict: Dict[str, Any]):
        log = AuditLog(
            log_id=str(uuid.uuid4()),
            actor_id=actor_id,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            details_json=details_dict,
            timestamp=datetime.utcnow(),
        )
        db.add(log)
        await db.flush()
