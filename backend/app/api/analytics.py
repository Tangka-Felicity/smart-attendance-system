from io import BytesIO
from typing import Literal

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.models import AttendanceRecord

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/student/{student_id}")
@router.get("/student/{student_id}/", include_in_schema=False)
async def student_analytics(student_id: str, db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    if current.get("role") == "STUDENT" and current.get("id") != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    # If student_id is empty or "undefined", use current user's id
    if not student_id or student_id == "undefined":
        student_id = current.get("id")

    # Optimization: Use SQL aggregation instead of fetching all records into memory.
    # This reduces O(N) memory and data transfer to O(1).
    q = select(
        func.count(AttendanceRecord.record_id).label("total_sessions"),
        func.sum(case((AttendanceRecord.attendance_pct > 0, 1), else_=0)).label("sessions_attended"),
        func.avg(func.coalesce(AttendanceRecord.attendance_pct, 0)).label("cumulative_pct"),
        func.avg(func.coalesce(AttendanceRecord.mark, 0)).label("cumulative_mark")
    ).where(AttendanceRecord.student_id == student_id)

    res = await db.execute(q)
    row = res.first()

    total_sessions = row.total_sessions if row and row.total_sessions else 0
    sessions_attended = int(row.sessions_attended) if row and row.sessions_attended else 0
    cumulative_pct = float(row.cumulative_pct) if row and row.cumulative_pct else 0.0
    cumulative_mark = float(row.cumulative_mark) if row and row.cumulative_mark else 0.0

    return {
        "sessions_attended": sessions_attended,
        "cumulative_pct": cumulative_pct,
        "cumulative_mark": cumulative_mark,
        "percentage": round(cumulative_pct, 1),
        "total_sessions": total_sessions
    }


@router.get("/reports")
@router.get("/reports/", include_in_schema=False)
async def get_reports(
    report_type: str = Query("summary", regex="^(summary|attendance_by_student|attendance_by_course)$"),
    db: AsyncSession = Depends(get_db),
    current=Depends(require_roles("SUPER_ADMIN")),
):
    # Optimization: Perform aggregation in the database instead of fetching all records.
    # This prevents memory exhaustion and excessive data transfer for large datasets.

    if report_type == "summary":
        q = select(
            func.count(AttendanceRecord.record_id).label("total"),
            func.avg(func.coalesce(AttendanceRecord.attendance_pct, 0)).label("avg_attendance")
        )
        res = await db.execute(q)
        row = res.first()
        return {
            "total_records": row.total if row else 0,
            "avg_attendance": float(row.avg_attendance) if row and row.avg_attendance else 0.0
        }

    if report_type == "attendance_by_student":
        q = select(
            AttendanceRecord.student_id,
            func.avg(func.coalesce(AttendanceRecord.attendance_pct, 0)).label("average_pct")
        ).group_by(AttendanceRecord.student_id)
        res = await db.execute(q)
        rows = res.all()
        return {
            "attendance_by_student": [
                {"student_id": str(row.student_id), "average_pct": float(row.average_pct)}
                for row in rows
            ]
        }

    if report_type == "attendance_by_course":
        q = select(
            AttendanceRecord.session_id,
            func.avg(func.coalesce(AttendanceRecord.attendance_pct, 0)).label("average_pct")
        ).group_by(AttendanceRecord.session_id)
        res = await db.execute(q)
        rows = res.all()
        return {
            "attendance_by_course": [
                {"session_id": str(row.session_id), "average_pct": float(row.average_pct)}
                for row in rows
            ]
        }

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported report type")


@router.get("/export")
@router.get("/export/", include_in_schema=False)
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
