from .admin import audit_router, anomaly_router
from .analytics import router as analytics_router
from .attendance import router as attendance_router
from .auth import router as auth_router
from .courses import router as courses_router
from .notifications import router as notifications_router
from .sessions import router as sessions_router
from .users import router as users_router

__all__ = [
    "auth_router",
    "users_router",
    "courses_router",
    "sessions_router",
    "attendance_router",
    "analytics_router",
    "notifications_router",
    "anomaly_router",
    "audit_router",
]
