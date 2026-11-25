"""Schémas Pydantic pour le tableau de bord financier."""

from typing import List, Optional
from pydantic import BaseModel

from app.schemas.budget import BudgetResponse
from app.schemas.transaction import TransactionResponse


class CategoryBreakdownItem(BaseModel):
    categorie: str
    montant: float
    couleur: str
    pourcentage: float


class MonthlyEvolutionItem(BaseModel):
    periode: str
    mois_label: str
    annee: int
    mois: int
    revenus: float
    depenses: float
    epargne: float


class BalanceEvolutionItem(BaseModel):
    date: str
    solde: float
    revenus: float
    depenses: float


class DashboardResponse(BaseModel):
    solde_total: float
    total_revenus: float
    total_depenses: float
    epargne: float
    taux_epargne: float
    nombre_transactions: int
    transactions_mois: int
    revenus_mois: float
    depenses_mois: float
    epargne_mois: float
    solde_evolution_pct: Optional[float] = None
    revenus_evolution_pct: Optional[float] = None
    depenses_evolution_pct: Optional[float] = None
    epargne_evolution_pct: Optional[float] = None
    mois_selectionne: int
    annee_selectionnee: int
    depenses_par_categorie: List[CategoryBreakdownItem]
    depenses_par_categorie_mois: List[CategoryBreakdownItem]
    evolution_mensuelle: List[MonthlyEvolutionItem]
    evolution_solde: List[BalanceEvolutionItem]
    transactions_recentes: List[TransactionResponse]
    budgets_mois: List[BudgetResponse]
    budgets_alertes: List[BudgetResponse]
    has_data: bool
