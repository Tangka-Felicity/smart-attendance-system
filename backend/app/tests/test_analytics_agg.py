import pytest
import uuid
from decimal import Decimal
from sqlalchemy import select, func, case, Column, String, Numeric, Text, UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Simplified base for testing aggregations without PostgreSQL specific types like JSONB
Base = declarative_base()

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    record_id = Column(UUID(as_uuid=True), primary_key=True)
    session_id = Column(UUID(as_uuid=True), nullable=False)
    student_id = Column(UUID(as_uuid=True), nullable=False)
    attendance_pct = Column(Numeric(5, 2), nullable=True)
    mark = Column(Numeric(4, 2), nullable=True)
    method = Column(String(50))

# Mocking the database for testing aggregation logic
DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.mark.asyncio
async def test_analytics_aggregation_logic():
    engine = create_async_engine(DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        student_id = uuid.uuid4()
        # Add test records
        records = [
            AttendanceRecord(
                record_id=uuid.uuid4(),
                session_id=uuid.uuid4(),
                student_id=student_id,
                attendance_pct=Decimal("80.0"),
                mark=Decimal("8.0"),
                method="AUTO"
            ),
            AttendanceRecord(
                record_id=uuid.uuid4(),
                session_id=uuid.uuid4(),
                student_id=student_id,
                attendance_pct=Decimal("0.0"),
                mark=Decimal("0.0"),
                method="AUTO"
            ),
            AttendanceRecord(
                record_id=uuid.uuid4(),
                session_id=uuid.uuid4(),
                student_id=student_id,
                attendance_pct=None,
                mark=None,
                method="AUTO"
            )
        ]
        session.add_all(records)
        await session.commit()

        # Test student_analytics logic
        q = select(
            func.count(AttendanceRecord.record_id).label("total_sessions"),
            func.sum(case((AttendanceRecord.attendance_pct > 0, 1), else_=0)).label("sessions_attended"),
            func.avg(func.coalesce(AttendanceRecord.attendance_pct, 0)).label("cumulative_pct"),
            func.avg(func.coalesce(AttendanceRecord.mark, 0)).label("cumulative_mark")
        ).where(AttendanceRecord.student_id == student_id)

        res = await session.execute(q)
        row = res.one()

        assert row.total_sessions == 3
        assert int(row.sessions_attended or 0) == 1
        # (80 + 0 + 0) / 3 = 26.666...
        assert float(row.cumulative_pct) == pytest.approx(26.666, 0.001)
        # (8 + 0 + 0) / 3 = 2.666...
        assert float(row.cumulative_mark) == pytest.approx(2.666, 0.001)

        # Test get_reports summary logic
        q_summary = select(
            func.count(AttendanceRecord.record_id).label("total"),
            func.avg(func.coalesce(AttendanceRecord.attendance_pct, 0)).label("avg_attendance")
        )
        res_summary = await session.execute(q_summary)
        row_summary = res_summary.one()
        assert row_summary.total == 3
        assert float(row_summary.avg_attendance) == pytest.approx(26.666, 0.001)

    await engine.dispose()
