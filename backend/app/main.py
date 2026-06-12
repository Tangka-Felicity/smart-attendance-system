from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    analytics_router,
    attendance_router,
    auth_router,
    audit_router,
    courses_router,
    notifications_router,
    sessions_router,
    users_router,
)
from app.core.config import settings
from app.core.dependencies import get_redis
from app.utils.http_client import HTTPClient
from app.workers.anomaly_worker import run_anomaly_checks
from app.workers.qr_worker import refresh_all_open_sessions
from app.services.scheduler_service import start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        refresh_all_open_sessions,
        "interval",
        seconds=25,
        id="refresh_all_open_sessions",
        replace_existing=True,
    )
    scheduler.add_job(
        run_anomaly_checks,
        "interval",
        minutes=15,
        id="run_anomaly_checks",
        replace_existing=True,
    )
    scheduler.start()
    start_scheduler()
    await get_redis()
    await HTTPClient.get_client()
    try:
        yield
    finally:
        scheduler.shutdown()
        redis = await get_redis()
        await redis.close()
        await HTTPClient.close_client()


app = FastAPI(
    title="Smart Attendance System API",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=True
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/v1")
app.include_router(users_router, prefix="/v1")
app.include_router(courses_router, prefix="/v1")
app.include_router(sessions_router, prefix="/v1")
app.include_router(attendance_router, prefix="/v1")
app.include_router(analytics_router, prefix="/v1")
app.include_router(notifications_router, prefix="/v1")
app.include_router(audit_router, prefix="/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
