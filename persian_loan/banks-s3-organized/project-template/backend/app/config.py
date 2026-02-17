"""
Application Configuration
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables."""

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "iranian_banks"

    # Application
    debug: bool = False
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # API
    api_prefix: str = "/api"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
