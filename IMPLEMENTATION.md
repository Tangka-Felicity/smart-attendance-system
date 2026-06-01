# Smart Attendance System Implementation Details

## Completed backend setup

- Created backend folder structure and app modules.
- Added `backend/requirements.txt` with exact package pins.
- Added `backend/.env` with database, redis, JWT, QR, Azure, FCM, CORS, and environment settings.
- Added `backend/alembic.ini` configured for PostgreSQL via `psycopg2`.
- Added `backend/app/core/config.py` with `pydantic-settings` `BaseSettings` configuration.
- Added `backend/app/core/security.py` with password hashing, token creation, token decoding, QR token signing, and signature verification.
- Added `backend/app/db/session.py` with async SQLAlchemy engine, `AsyncSessionLocal`, `Base`, and async database context manager.
- Added `backend/app/utils/haversine.py` with `haversine_metres(...)`.
- Added `backend/app/core/dependencies.py` with Redis singleton helper, current user dependency, and role-based access dependency.

## Models implemented

- Added `backend/app/models/models.py` with 11 async SQLAlchemy ORM models:
  - `User`
  - `Student`
  - `Course`
  - `CourseEnrollment`
  - `Session`
  - `QRToken`
  - `QRTokenUsage`
  - `AttendanceRecord`
  - `Notification`
  - `AnomalyFlag`
  - `AuditLog`

## Data model details

- PostgreSQL enums defined for `user_role`, `user_status`, `session_category`, `session_status`, `attendance_method`, `notification_type`, and `anomaly_type`.
- Added all requested foreign keys, delete behaviors, unique constraints, check constraints, and partial indexes.
- Connected models with `relationship(..., back_populates=...)` across user, student, course, session, token, attendance, notification, anomaly, and audit log entities.

## Next steps

- Add migration scripts for the model definitions.
- Implement API routes and schemas for user, course, session, and attendance workflows.
- Add tests for authentication, database session handling, and model constraints.

## Services added

- `backend/app/services/audit_service.py`: `AuditService.log` creates `AuditLog` entries and flushes them to the DB session without committing.
- `backend/app/services/notification_service.py`: `NotificationService` persists notifications and attempts to dispatch FCM messages using a Google service account when configured. Also includes `notify_super_admins` and a threshold evaluator to trigger warnings.
- `backend/app/services/qr_service.py`: `QRService` creates HMAC-signed QR tokens, stores them in Redis with TTL, validates token signature and usage, marks usage, invalidates session tokens, and provides helpers to read active tokens and TTL.
- `backend/app/services/face_service.py`: `AzureFaceService` with `FaceIdentifyResult` dataclass; performs person-group management, face registration, identify, and deletion using `httpx.AsyncClient` (15s timeout). Stubs gracefully when Azure not configured.
- `backend/app/services/auth_service.py`: `AuthService` handles `login`, `refresh`, and `logout`, including Redis-backed failed-login tracking and suspension, token generation, and blocklisting.
- `backend/app/services/attendance_service.py`: `AttendanceService` implements `checkin`, `checkout`, `_calculate_score`, `manual_mark`, and `sync_offline`, coordinating QR, GPS (haversine), face identification, notifications, and audit logging.

All new services use the async SQLAlchemy `AsyncSession` patterns and `aioredis` for Redis interactions. They intentionally avoid committing transactions so callers can manage transaction scope.
