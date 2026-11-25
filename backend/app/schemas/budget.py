"""Schémas Pydantic pour les budgets mensuels."""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


AlertLevel = Literal["ok", "warning", "critical", "exceeded"]


class BudgetCreateRequest(BaseModel):
    categorie: str = Field(..., min_length=1, max_length=80, description="Nom de la catégorie ou 'Global'")
    montant_limite: float = Field(..., gt=0, description="Plafond budgétaire en MAD")
    periode: Literal["mensuelle"] = "mensuelle"
    mois: int = Field(..., ge=1, le=12)
    annee: int = Field(..., ge=2000, le=2100)

    @field_validator("categorie")
    @classmethod
    def clean_categorie(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("La catégorie est obligatoire.")
        return cleaned

    @field_validator("montant_limite")
    @classmethod
    def round_limite(cls, v: float) -> float:
        return round(float(v), 2)


class BudgetUpdateRequest(BaseModel):
    categorie: Optional[str] = Field(default=None, min_length=1, max_length=80)
    montant_limite: Optional[float] = Field(default=None, gt=0)
    mois: Optional[int] = Field(default=None, ge=1, le=12)
    annee: Optional[int] = Field(default=None, ge=2000, le=2100)

    @field_validator("categorie")
    @classmethod
    def clean_categorie(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("La catégorie ne peut pas être vide.")
        return cleaned

    @field_validator("montant_limite")
    @classmethod
    def round_limite(cls, v: Optional[float]) -> Optional[float]:
        return round(float(v), 2) if v is not None else None


class BudgetResponse(BaseModel):
    id: str
    user_id: str
    categorie: str
    montant_limite: float
    periode: str
    mois: int
    annee: int
    montant_consomme: float
    montant_restant: float
    pourcentage_utilise: float
    alerte_niveau: AlertLevel
    alerte_message: Optional[str] = None
    created_at: datetime
