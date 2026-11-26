"""Configuration centralisée de l'application Finora."""

from functools import lru_cache
from typing import List
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Paramètres chargés depuis le fichier .env et les variables d'environnement."""

    APP_NAME: str = "Finora API"
    APP_VERSION: str = "2.0.0"
    DEFAULT_CURRENCY: str = "MAD"

    MONGO_URI: str = Field(
        default="mongodb://localhost:27017/",
        validation_alias=AliasChoices("MONGO_URI", "MONGODB_URI"),
    )
    MONGODB_DATABASE: str = Field(
        default="choaib",
        validation_alias=AliasChoices("MONGO_DATABASE", "MONGODB_DATABASE"),
    )

    JWT_SECRET: str = "change_this_secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
