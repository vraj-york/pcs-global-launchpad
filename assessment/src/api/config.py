"""
API configuration
"""
import os

from pydantic import Field
from pydantic_settings import BaseSettings

from api.cors_env import frontend_origin_for_environment


def _default_cors_origins() -> list[str]:
    """Single origin for the active environment; override with CORS_ORIGINS env (JSON)."""
    return [frontend_origin_for_environment(os.getenv("ENVIRONMENT", "development"))]


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_TITLE: str = "Assessment Module API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "CRUD operations for assessment questions, options, and BSP styles"
    
    # Database Settings
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "bspdb")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
    
    # CORS — primary origin from ENVIRONMENT (see api.cors_env). Lambda sets CORS_ORIGINS in CDK.
    # Override via env or .env as JSON, e.g. CORS_ORIGINS='["https://dev.example.com"]'
    CORS_ORIGINS: list[str] = Field(default_factory=_default_cors_origins)
    CORS_CREDENTIALS: bool = os.getenv("CORS_CREDENTIALS", True)
    CORS_METHODS: list = os.getenv("CORS_METHODS", ["*"])
    CORS_HEADERS: list = os.getenv("CORS_HEADERS", ["*"])
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 500
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Cognito JWT verification (required for API auth; set in Lambda / local .env)
    COGNITO_USER_POOL_ID: str = os.getenv("COGNITO_USER_POOL_ID", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")

    @property
    def DATABASE_URL(self) -> str:
        """Construct database URL"""
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields from .env that aren't in the model

# Global settings instance
settings = Settings()