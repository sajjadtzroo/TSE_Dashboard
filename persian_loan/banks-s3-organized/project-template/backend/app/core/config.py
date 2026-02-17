"""
Application Configuration
"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables."""

    # Application
    app_name: str = "Iranian Banks Loan Dashboard"
    app_version: str = "1.0.0"
    debug: bool = False

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "iranian_banks"

    # CORS - REQUIRED: Comma-separated list of allowed origins (DO NOT use * in production)
    cors_origins: str

    # API
    api_prefix: str = "/api"

    # JWT Authentication
    secret_key: str = "CHANGE_THIS_TO_A_SECURE_SECRET_KEY_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    # Redis Cache
    redis_url: str = "redis://localhost:6379/0"
    cache_enabled: bool = True
    cache_default_ttl: int = 300  # 5 minutes
    cache_key_prefix: str = "ploan:cache"

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, v: str, info) -> str:
        """Validate CORS origins - no wildcards allowed in production."""
        if not v:
            raise ValueError("CORS_ORIGINS is required. Set it in .env file.")

        # Check for wildcard in production
        debug = info.data.get("debug", False)
        if not debug and "*" in v:
            raise ValueError(
                "Wildcard (*) is not allowed in CORS_ORIGINS when DEBUG=false. "
                "Specify exact origins (e.g., https://example.com,https://app.example.com)"
            )

        return v

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
