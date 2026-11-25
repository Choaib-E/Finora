"""Schémas Pydantic pour les rapports financiers."""

from typing import List
from pydantic import BaseModel

from app.schemas.dashboard import (
    BalanceEvolutionItem,
    CategoryBreakdownItem,
    MonthlyEvolutionItem,
)


class ReportSummaryResponse(BaseModel):
    total_revenus: float
    total_depenses: float
    epargne_nette: float
    taux_epargne: float
    nombre_transactions: int
    depenses_par_categorie: List[CategoryBreakdownItem]
    comparaison_mensuelle: List[MonthlyEvolutionItem]
    evolution_solde: List[BalanceEvolutionItem]
