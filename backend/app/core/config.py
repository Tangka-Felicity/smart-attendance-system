from pathlib import Path
from typing import List
from pydantic import AnyUrl, BaseModel
from pydantic_settings import BaseSettings


def _parse_cors_origins(value: str) -> List[str]:
    return [origin.strip().strip('"').strip("'") for origin in value.strip('[]').split(',') if origin.strip()]


class Settings(BaseSettings):
    DATABASE_URL: AnyUrl
    REDIS_URL: AnyUrl
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    QR_HMAC_SECRET: str
    QR_TOKEN_TTL_SECONDS: int = 30
    AZURE_FACE_ENDPOINT: str = ""
    AZURE_FACE_KEY: str = ""
    AZURE_FACE_CONFIDENCE_THRESHOLD: float = 0.7
    FCM_PROJECT_ID: str = ""
    FCM_SERVICE_ACCOUNT_JSON: str = "serviceAccountKey.json"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]
    ENVIRONMENT: str = "development"
    LOGIN_MAX_ATTEMPTS: int = 5
    DEFAULT_ADMIN_ID: str = "00000000-0000-0000-0000-000000000001"
    DEFAULT_ADMIN_EMAIL: str = "admin@institution.edu"
    DEFAULT_ADMIN_PASSWORD: str = "Admin@1234"

    model_config = {
        "env_file": Path(__file__).resolve().parents[2] / ".env",
        "env_file_encoding": "utf-8",
    }

    @classmethod
    def customise_sources(cls, init_settings, env_settings, file_secret_settings):
        return (
            init_settings,
            env_settings,
            file_secret_settings,
        )

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return _parse_cors_origins(self.CORS_ORIGINS)
        return self.CORS_ORIGINS


settings = Settings()
