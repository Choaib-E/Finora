"""Schémas Pydantic pour les transactions financières."""

import datetime as dt
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


TransactionType = Literal["revenu", "depense"]


class TransactionBase(BaseModel):
    date: dt.date = Field(..., description="Date de la transaction (YYYY-MM-DD)")
    montant: float = Field(..., gt=0, description="Montant positif en MAD")
    categorie: str = Field(..., min_length=1, max_length=80, description="Nom de la catégorie")
    type: TransactionType = Field(..., description="Type : revenu ou depense")
    description: str = Field(default="", max_length=255, description="Libellé ou commentaire")

    @field_validator("montant")
    @classmethod
    def round_montant(cls, v: float) -> float:
        rounded = round(float(v), 2)
        if rounded <= 0:
            raise ValueError("Le montant doit être strictement supérieur à 0.")
        return rounded

    @field_validator("categorie")
    @classmethod
    def clean_categorie(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("La catégorie est obligatoire.")
        return cleaned

    @field_validator("description")
    @classmethod
    def clean_description(cls, v: str) -> str:
        return v.strip()


class TransactionCreateRequest(TransactionBase):
    pass


class TransactionUpdateRequest(BaseModel):
    date: Optional[dt.date] = None
    montant: Optional[float] = Field(default=None, gt=0)
    categorie: Optional[str] = Field(default=None, min_length=1, max_length=80)
    type: Optional[TransactionType] = None
    description: Optional[str] = Field(default=None, max_length=255)

    @field_validator("montant")
    @classmethod
    def round_montant(cls, v: Optional[float]) -> Optional[float]:
        if v is None:
            return None
        rounded = round(float(v), 2)
        if rounded <= 0:
            raise ValueError("Le montant doit être strictement supérieur à 0.")
        return rounded

    @field_validator("categorie")
    @classmethod
    def clean_categorie(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("La catégorie ne peut pas être vide.")
        return cleaned

    @field_validator("description")
    @classmethod
    def clean_description(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v is not None else None


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    date: dt.datetime
    montant: float
    categorie: str
    type: TransactionType
    description: str
    created_at: dt.datetime


class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    total_revenus: float
    total_depenses: float
    page: int
    limit: int
    total_pages: int
