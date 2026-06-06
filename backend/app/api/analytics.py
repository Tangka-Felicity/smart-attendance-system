from io import BytesIO
from typing import Literal

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.models import AttendanceRecord

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/student/{student_id}")
@router.get("/student/{student_id}/", include_in_schema=False)
async def student_analytics(student_id: str, db: AsyncSession = Depends(get_db), current=Depends(get_current_user())):
    """
    ⚡ Bolt: Optimized using SQL-level aggregations.
    Reduces memory usage from O(N) to O(1) by avoiding fetching all attendance records.
    """
    if current.get("role") == "STUDENT" and current.get("id") != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    # If student_id is empty or "undefined", use current user's id
    if not student_id or student_id == "undefined":
        student_id = current.get("id")

    q = select(
        func.count(AttendanceRecord.record_id).label("total_sessions"),
        func.sum(case((AttendanceRecord.attendance_pct > 0, 1), else_=0)).label("sessions_attended"),
        func.avg(func.coalesce(AttendanceRecord.attendance_pct, 0)).label("cumulative_pct"),
        func.avg(func.coalesce(AttendanceRecord.mark, 0)).label("cumulative_mark")
    ).where(AttendanceRecord.student_id == student_id)

    res = await db.execute(q)
    row = res.one()

    total_sessions = row.total_sessions or 0
    sessions_attended = int(row.sessions_attended or 0)
    cumulative_pct = float(row.cumulative_pct or 0)
    cumulative_mark = float(row.cumulative_mark or 0)

    # Also return percentage for mobile dashboard compatibility
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
    """
    ⚡ Bolt: Optimized by moving Python grouping/averaging to SQL GROUP BY.
    Scales efficiently with large datasets.
    """
    if report_type == "summary":
        q = select(
            func.count(AttendanceRecord.record_id).label("total"),
            func.avg(func.coalesce(AttendanceRecord.attendance_pct, 0)).label("avg_attendance")
        )
        res = await db.execute(q)
        row = res.one()
        return {
            "total_records": row.total or 0,
            "avg_attendance": float(row.avg_attendance or 0)
        }

    if report_type == "attendance_by_student":
        q = select(
            AttendanceRecord.student_id,
            func.avg(func.coalesce(AttendanceRecord.attendance_pct, 0)).label("average_pct")
        ).group_by(AttendanceRecord.student_id)
        res = await db.execute(q)
        return {
            "attendance_by_student": [
                {"student_id": row.student_id, "average_pct": float(row.average_pct or 0)}
                for row in res.all()
            ]
        }

    if report_type == "attendance_by_course":
        q = select(
            AttendanceRecord.session_id,
            func.avg(func.coalesce(AttendanceRecord.attendance_pct, 0)).label("average_pct")
        ).group_by(AttendanceRecord.session_id)
        res = await db.execute(q)
        return {
            "attendance_by_course": [
                {"session_id": row.session_id, "average_pct": float(row.average_pct or 0)}
                for row in res.all()
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
    """
    ⚡ Bolt: Optimized by selecting only necessary columns.
    Reduces DB traffic and memory overhead by avoiding full ORM object hydration.
    """
    q = select(
        AttendanceRecord.record_id,
        AttendanceRecord.session_id,
        AttendanceRecord.student_id,
        AttendanceRecord.attendance_pct,
        AttendanceRecord.mark
    )
    res = await db.execute(q)
    rows = [
        {
            "record_id": str(row.record_id),
            "session_id": str(row.session_id),
            "student_id": str(row.student_id),
            "attendance_pct": float(row.attendance_pct) if row.attendance_pct is not None else None,
            "mark": float(row.mark) if row.mark is not None else None,
        }
        for row in res.all()
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
