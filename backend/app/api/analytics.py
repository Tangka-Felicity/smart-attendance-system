from io import BytesIO
from typing import Literal

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.models import AttendanceRecord

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/student/{student_id}")
async def student_analytics(student_id: str, db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    if current.get("role") == "STUDENT" and current.get("id") != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    # If student_id is empty or "undefined", use current user's id
    if not student_id or student_id == "undefined":
        student_id = current.get("id")

    q = select(AttendanceRecord).where(AttendanceRecord.student_id == student_id)
    res = await db.execute(q)
    records = res.scalars().all()

    sessions_attended = sum(1 for r in records if r.attendance_pct is not None and float(r.attendance_pct) > 0)
    total_records = len(records)
    cumulative_pct = sum(float(r.attendance_pct or 0) for r in records) / total_records if total_records else 0
    cumulative_mark = sum(float(r.mark or 0) for r in records) / total_records if total_records else 0

    # Also return percentage for mobile dashboard compatibility
    return {
        "sessions_attended": sessions_attended,
        "cumulative_pct": cumulative_pct,
        "cumulative_mark": cumulative_mark,
        "percentage": round(cumulative_pct, 1),
        "total_sessions": total_records
    }


@router.get("/reports")
async def get_reports(
    report_type: str = Query("summary", regex="^(summary|attendance_by_student|attendance_by_course)$"),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN")),
):
    q = select(AttendanceRecord)
    res = await db.execute(q)
    records = res.scalars().all()
    if report_type == "summary":
        total = len(records)
        avg_attendance = sum(float(r.attendance_pct or 0) for r in records) / total if total else 0
        return {"total_records": total, "avg_attendance": avg_attendance}

    if report_type == "attendance_by_student":
        grouped = {}
        for r in records:
            grouped.setdefault(r.student_id, []).append(r.attendance_pct or 0)
        return {
            "attendance_by_student": [
                {"student_id": sid, "average_pct": sum(vals) / len(vals)}
                for sid, vals in grouped.items()
            ]
        }

    if report_type == "attendance_by_course":
        grouped = {}
        for r in records:
            grouped.setdefault(r.session_id, []).append(r.attendance_pct or 0)
        return {
            "attendance_by_course": [
                {"session_id": sid, "average_pct": sum(vals) / len(vals)}
                for sid, vals in grouped.items()
            ]
        }

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported report type")


@router.get("/export")
async def export_analytics(
    fmt: Literal["csv", "xlsx"] = "csv",
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN")),
):
    q = select(AttendanceRecord)
    res = await db.execute(q)
    records = res.scalars().all()
    rows = [
        {
            "record_id": r.record_id,
            "session_id": r.session_id,
            "student_id": r.student_id,
            "attendance_pct": r.attendance_pct,
            "mark": r.mark,
        }
        for r in records
    ]
    df = pd.DataFrame(rows)
    buffer = BytesIO()
    if fmt == "csv":
        df.to_csv(buffer, index=False)
        content_type = "text/csv"
        filename = "attendance.csv"
    else:
        df.to_excel(buffer, index=False)
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "attendance.xlsx"
    buffer.seek(0)
    return StreamingResponse(buffer, media_type=content_type, headers={"Content-Disposition": f"attachment; filename={filename}"})
