"""Routes API pour la gestion des budgets."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from pymongo.database import Database

from app.api.deps import get_current_user
from app.database.mongo import get_db
from app.schemas.auth import MessageResponse
from app.schemas.budget import BudgetCreateRequest, BudgetResponse, BudgetUpdateRequest
from app.services.budget_service import BudgetService

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get("", response_model=List[BudgetResponse], summary="Lister les budgets avec consommation calculée")
def list_budgets(
    mois: Optional[int] = Query(default=None, ge=1, le=12),
    annee: Optional[int] = Query(default=None, ge=2000, le=2100),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> List[BudgetResponse]:
    return BudgetService(db).list_budgets(current_user["_id"], mois=mois, annee=annee)


@router.post(
    "",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un budget mensuel (par catégorie ou Global)",
)
def create_budget(
    payload: BudgetCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> BudgetResponse:
    return BudgetService(db).create_budget(current_user["_id"], payload)


@router.put("/{budget_id}", response_model=BudgetResponse, summary="Modifier un budget")
def update_budget(
    budget_id: str,
    payload: BudgetUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> BudgetResponse:
    return BudgetService(db).update_budget(current_user["_id"], budget_id, payload)


@router.delete("/{budget_id}", response_model=MessageResponse, summary="Supprimer un budget")
def delete_budget(
    budget_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> MessageResponse:
    BudgetService(db).delete_budget(current_user["_id"], budget_id)
    return MessageResponse(message="Budget supprimé avec succès.")
