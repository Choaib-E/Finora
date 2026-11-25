"""Schémas Pydantic pour les catégories."""

from datetime import datetime
import re
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator

_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class CategoryCreateRequest(BaseModel):
    nom: str = Field(..., min_length=1, max_length=60)
    type: Literal["revenu", "depense"]
    couleur: str = Field(default="#315CF5")

    @field_validator("nom")
    @classmethod
    def clean_nom(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Le nom de la catégorie est obligatoire.")
        return cleaned

    @field_validator("couleur")
    @classmethod
    def validate_color(cls, v: str) -> str:
        cleaned = v.strip()
        if not _HEX_COLOR_RE.match(cleaned):
            raise ValueError("La couleur doit être au format hexadécimal (#RRGGBB).")
        return cleaned.upper()


class CategoryUpdateRequest(BaseModel):
    nom: Optional[str] = Field(default=None, min_length=1, max_length=60)
    type: Optional[Literal["revenu", "depense"]] = None
    couleur: Optional[str] = None

    @field_validator("nom")
    @classmethod
    def clean_nom(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Le nom ne peut pas être vide.")
        return cleaned

    @field_validator("couleur")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not _HEX_COLOR_RE.match(cleaned):
            raise ValueError("La couleur doit être au format hexadécimal (#RRGGBB).")
        return cleaned.upper()


class CategoryResponse(BaseModel):
    id: str
    user_id: str
    nom: str
    type: Literal["revenu", "depense"]
    couleur: str
    transaction_count: int = 0
    created_at: datetime
