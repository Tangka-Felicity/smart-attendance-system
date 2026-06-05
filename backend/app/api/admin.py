from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.models import AnomalyFlag, AuditLog

anomaly_router = APIRouter(prefix="/anomalies", tags=["anomalies"])
audit_router = APIRouter(prefix="/audit", tags=["audit"])


@anomaly_router.get("")
@anomaly_router.get("/", include_in_schema=False)
async def list_anomalies(
    resolved: bool = Query(None),
    limit: int = Query(50, gt=0),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN")),
):
    q = select(AnomalyFlag)
    if resolved is not None:
        q = q.where(AnomalyFlag.resolved_at.isnot(None) if resolved else AnomalyFlag.resolved_at.is_(None))
    q = q.limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()


@anomaly_router.put("/{flag_id}/resolve")
@anomaly_router.put("/{flag_id}/resolve/", include_in_schema=False)
async def resolve_anomaly(
    flag_id: str,
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN")),
):
    flag = await db.get(AnomalyFlag, flag_id)
    if not flag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    flag.resolved_at = datetime.now(tz=timezone.utc)
    flag.resolved_by = current.get("id")
    await db.flush()
    return flag


@audit_router.get("")
@audit_router.get("/", include_in_schema=False)
async def list_audit_logs(
    limit: int = Query(50, gt=0),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN")),
):
    q = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()
