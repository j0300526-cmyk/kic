from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AlphaMix API"
    environment: str = "development"
    database_url: str = "sqlite:///./alphamix.db"
    cors_origins: list[str] = ["http://localhost:5173"]
    model_provider: str | None = None
    model_name: str | None = None
    model_api_key: str | None = None

    model_config = SettingsConfigDict(
        env_prefix="ALPHAMIX_",
        env_file=".env",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip().startswith("["):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def database_path(self) -> Path:
        prefix = "sqlite:///"
        if not self.database_url.startswith(prefix):
            raise ValueError("The MVP supports only sqlite:/// database URLs.")
        return Path(self.database_url.removeprefix(prefix)).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()

