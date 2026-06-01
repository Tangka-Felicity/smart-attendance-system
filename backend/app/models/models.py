import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Column,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Boolean,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PGEnum, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    LECTURER = "LECTURER"
    COORDINATOR = "COORDINATOR"
    STUDENT = "STUDENT"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    INACTIVE = "INACTIVE"


class SessionCategory(str, enum.Enum):
    MANDATORY = "MANDATORY"
    REGULAR = "REGULAR"
    OPTIONAL = "OPTIONAL"


class SessionStatus(str, enum.Enum):
    PENDING = "PENDING"
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class AttendanceMethod(str, enum.Enum):
    AUTO = "AUTO"
    MANUAL = "MANUAL"


class NotificationType(str, enum.Enum):
    SESSION_ANNOUNCED = "SESSION_ANNOUNCED"
    CHECKIN_CONFIRMED = "CHECKIN_CONFIRMED"
    EARLY_DEPARTURE = "EARLY_DEPARTURE"
    WARNING_THRESHOLD = "WARNING_THRESHOLD"
    AT_RISK_THRESHOLD = "AT_RISK_THRESHOLD"
    COORDINATOR_LIMIT_EXCEEDED = "COORDINATOR_LIMIT_EXCEEDED"
    FACE_FAILURE = "FACE_FAILURE"
    ANOMALY_DETECTED = "ANOMALY_DETECTED"


class AnomalyType(str, enum.Enum):
    ATTENDANCE_DROP = "ATTENDANCE_DROP"
    COORDINATOR_ABUSE = "COORDINATOR_ABUSE"
    REPEATED_FACE_FAILURE = "REPEATED_FACE_FAILURE"
    GRACE_PERIOD_GAMING = "GRACE_PERIOD_GAMING"
    GEOFENCE_SPIKE = "GEOFENCE_SPIKE"


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", create_type=True), nullable=False
    )
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, name="user_status", create_type=True), nullable=False, server_default=UserStatus.ACTIVE.value
    )
    fcm_token: Mapped[str] = mapped_column(String(512), nullable=True)
    # Profile fields (consumed by web/mobile Profile screens)
    avatar_base64: Mapped[str] = mapped_column(Text, nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    department: Mapped[str] = mapped_column(String(100), nullable=True)
    staff_id: Mapped[str] = mapped_column(String(50), nullable=True)
    bio: Mapped[str] = mapped_column(Text, nullable=True)
    first_login: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), server_onupdate=func.now(), nullable=False
    )

    student = relationship("Student", back_populates="user", uselist=False)
    courses = relationship("Course", back_populates="lecturer", foreign_keys="Course.lecturer_id")
    coordinated_sessions = relationship("Session", back_populates="coordinator", foreign_keys="Session.coordinator_id")
    manual_marked_records = relationship("AttendanceRecord", back_populates="manual_marker", foreign_keys="AttendanceRecord.manual_marker_id")
    notifications = relationship("Notification", back_populates="recipient")
    resolved_anomalies = relationship("AnomalyFlag", back_populates="resolved_by_user", foreign_keys="AnomalyFlag.resolved_by")
    audit_logs = relationship("AuditLog", back_populates="actor")


class Student(Base):
    __tablename__ = "students"

    student_id:         Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    student_number:     Mapped[str]             = mapped_column(String(50), unique=True, nullable=False, index=True)
    face_profile_id:    Mapped[str | None]      = mapped_column(String(255), nullable=True)
    face_embedding:     Mapped[str | None]      = mapped_column(Text, nullable=True)  # JSON array of 128 floats
    face_registered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user:               Mapped["User"]                   = relationship("User",               back_populates="student")
    enrollments:        Mapped[list["CourseEnrollment"]] = relationship("CourseEnrollment",   back_populates="student", cascade="all, delete-orphan")
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship("AttendanceRecord",   foreign_keys="AttendanceRecord.student_id", back_populates="student")
    qr_usages:          Mapped[list["QRTokenUsage"]]     = relationship("QRTokenUsage",       back_populates="student", cascade="all, delete-orphan")
    anomaly_flags:      Mapped[list["AnomalyFlag"]]      = relationship("AnomalyFlag",        foreign_keys="AnomalyFlag.affected_student_id", back_populates="affected_student")


class Course(Base):
    __tablename__ = "courses"

    course_id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    lecturer_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False)
    semester: Mapped[str] = mapped_column(String(20), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(9), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    lecturer = relationship("User", back_populates="courses")
    enrollments = relationship("CourseEnrollment", back_populates="course")
    sessions = relationship("Session", back_populates="course")
    anomaly_flags = relationship("AnomalyFlag", back_populates="affected_course")

    __table_args__ = (
        UniqueConstraint("code", "academic_year", name="uq_course_code_academic_year"),
    )


class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"

    enrollment_id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.course_id", ondelete="CASCADE"), nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("Student", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", name="uq_enrollment_student_course"),
    )


class Session(Base):
    __tablename__ = "sessions"

    session_id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    course_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.course_id", ondelete="RESTRICT"), nullable=False)
    coordinator_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    venue_name: Mapped[str] = mapped_column(String(200), nullable=False)
    latitude: Mapped[Numeric] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[Numeric] = mapped_column(Numeric(10, 7), nullable=False)
    geofence_radius: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("50"))
    grace_period: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("15"))
    category: Mapped[SessionCategory] = mapped_column(
        SAEnum(SessionCategory, name="session_category", create_type=True), nullable=False, server_default=SessionCategory.REGULAR.value
    )
    status: Mapped[SessionStatus] = mapped_column(
        SAEnum(SessionStatus, name="session_status", create_type=True), nullable=False, server_default=SessionStatus.PENDING.value
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    course = relationship("Course", back_populates="sessions")
    coordinator = relationship("User", back_populates="coordinated_sessions")
    qr_tokens = relationship("QRToken", back_populates="session")
    attendance_records = relationship("AttendanceRecord", back_populates="session")
    anomaly_flags = relationship("AnomalyFlag", back_populates="affected_session")

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_session_end_after_start"),
        CheckConstraint("geofence_radius BETWEEN 10 AND 5000", name="ck_session_geofence_radius_range"),
        CheckConstraint("grace_period >= 0", name="ck_session_grace_period_non_negative"),
    )


class QRToken(Base):
    __tablename__ = "qr_tokens"

    token_id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    session_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.session_id", ondelete="CASCADE"), nullable=False)
    token_value: Mapped[str] = mapped_column(String(512), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

    session = relationship("Session", back_populates="qr_tokens")
    usages = relationship("QRTokenUsage", back_populates="token")

    __table_args__ = (
        Index("ix_qr_tokens_session_active", "session_id", postgresql_where=text("is_active = true")),
    )


class QRTokenUsage(Base):
    __tablename__ = "qr_token_usages"

    usage_id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    token_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("qr_tokens.token_id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    token = relationship("QRToken", back_populates="usages")
    student = relationship("Student", back_populates="qr_usages")

    __table_args__ = (
        UniqueConstraint("token_id", "student_id", name="uq_qr_usage_token_student"),
    )


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    record_id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    session_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.session_id", ondelete="RESTRICT"), nullable=False)
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("students.student_id", ondelete="RESTRICT"), nullable=False)
    arrival_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    departure_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    effective_arrival: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    attendance_pct: Mapped[Numeric] = mapped_column(Numeric(5, 2), nullable=True)
    mark: Mapped[Numeric] = mapped_column(Numeric(4, 2), nullable=True)
    method: Mapped[AttendanceMethod] = mapped_column(
        SAEnum(AttendanceMethod, name="attendance_method", create_type=True), nullable=False, server_default=AttendanceMethod.AUTO.value
    )
    manual_marker_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    manual_reason: Mapped[str] = mapped_column(Text, nullable=True)
    is_makeup: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session = relationship("Session", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")
    manual_marker = relationship("User", back_populates="manual_marked_records")

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_attendance_session_student"),
        CheckConstraint("attendance_pct BETWEEN 0 AND 100", name="ck_attendance_pct_range"),
        CheckConstraint("mark BETWEEN 0 AND 10", name="ck_attendance_mark_range"),
        CheckConstraint("method = 'AUTO' OR manual_reason IS NOT NULL", name="ck_attendance_manual_reason_required"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    notification_id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    recipient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    type: Mapped[NotificationType] = mapped_column(
        SAEnum(NotificationType, name="notification_type", create_type=True), nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    recipient = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_unread", "recipient_id", postgresql_where=text("read_at IS NULL")),
    )


class AnomalyFlag(Base):
    __tablename__ = "anomaly_flags"

    flag_id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    type: Mapped[AnomalyType] = mapped_column(
        SAEnum(AnomalyType, name="anomaly_type", create_type=True), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    affected_student_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("students.student_id", ondelete="SET NULL"), nullable=True)
    affected_session_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.session_id", ondelete="SET NULL"), nullable=True)
    affected_course_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.course_id", ondelete="SET NULL"), nullable=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    affected_student = relationship("Student", back_populates="anomaly_flags")
    affected_session = relationship("Session", back_populates="anomaly_flags")
    affected_course = relationship("Course", back_populates="anomaly_flags")
    resolved_by_user = relationship("User", back_populates="resolved_anomalies")

    __table_args__ = (
        Index("ix_anomaly_flags_unresolved", "resolved_at", postgresql_where=text("resolved_at IS NULL")),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    actor_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    details_json: Mapped[dict] = mapped_column(JSONB, nullable=False)

    actor = relationship("User", back_populates="audit_logs")