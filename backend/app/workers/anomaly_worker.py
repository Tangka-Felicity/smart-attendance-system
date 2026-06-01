import uuid
from datetime import datetime, timedelta

from sqlalchemy import func, select

from app.db.session import get_db_context
from app.models.models import AnomalyFlag, AnomalyType, AttendanceRecord


async def run_anomaly_checks() -> None:
    try:
        await _check_attendance_drops()
    except Exception as exc:
        print(f"run_anomaly_checks error: {exc}")


async def _check_attendance_drops() -> None:
    now = datetime.utcnow()
    start_this_week = now - timedelta(days=7)
    start_last_week = now - timedelta(days=14)
    end_last_week = now - timedelta(days=7)

    async with get_db_context() as db:
        q_this_week = (
            select(AttendanceRecord.student_id, func.avg(AttendanceRecord.attendance_pct).label("avg_pct"))
            .where(AttendanceRecord.arrival_time >= start_this_week)
            .group_by(AttendanceRecord.student_id)
        )
        q_last_week = (
            select(AttendanceRecord.student_id, func.avg(AttendanceRecord.attendance_pct).label("avg_pct"))
            .where(AttendanceRecord.arrival_time >= start_last_week)
            .where(AttendanceRecord.arrival_time < end_last_week)
            .group_by(AttendanceRecord.student_id)
        )

        res_this = await db.execute(q_this_week)
        this_week_map = {row.student_id: float(row.avg_pct or 0) for row in res_this}

        res_last = await db.execute(q_last_week)
        last_week_map = {row.student_id: float(row.avg_pct or 0) for row in res_last}

        for student_id, last_avg in last_week_map.items():
            this_avg = this_week_map.get(student_id, 0.0)
            drop = last_avg - this_avg
            if drop > 20.0:
                flag_query = (
                    select(AnomalyFlag)
                    .where(AnomalyFlag.affected_student_id == student_id)
                    .where(AnomalyFlag.type == AnomalyType.ATTENDANCE_DROP)
                    .where(AnomalyFlag.resolved_at.is_(None))
                )
                existing = await db.execute(flag_query)
                if existing.scalars().first():
                    continue

                description = (
                    f"Attendance drop of {drop:.2f}% for student {student_id}: "
                    f"last week avg {last_avg:.2f}%, this week avg {this_avg:.2f}%"
                )
                anomaly = AnomalyFlag(
                    flag_id=str(uuid.uuid4()),
                    type=AnomalyType.ATTENDANCE_DROP,
                    description=description,
                    affected_student_id=student_id,
                )
                db.add(anomaly)
        await db.flush()
