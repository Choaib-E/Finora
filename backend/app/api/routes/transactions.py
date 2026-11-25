"""Routes API pour la gestion des transactions financières."""

from datetime import date
from typing import Any, Dict, Literal, Optional
from fastapi import APIRouter, Depends, Query, status
from pymongo.database import Database

from app.api.deps import get_current_user
from app.database.mongo import get_db
from app.schemas.auth import MessageResponse
from app.schemas.transaction import (
    TransactionCreateRequest,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdateRequest,
)
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=TransactionListResponse, summary="Lister et filtrer les transactions de l'utilisateur")
def list_transactions(
    search: Optional[str] = Query(default=None, max_length=100),
    type: Optional[Literal["revenu", "depense"]] = Query(default=None),
    categorie: Optional[str] = Query(default=None, max_length=80),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    sort_by: Literal["date", "montant"] = Query(default="date"),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=500),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> TransactionListResponse:
    return TransactionService(db).list_transactions(
        user_oid=current_user["_id"],
        search=search,
        tx_type=type,
        categorie=categorie,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit,
    )


@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ajouter une nouvelle transaction",
)
def create_transaction(
    payload: TransactionCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> TransactionResponse:
    return TransactionService(db).create_transaction(current_user["_id"], payload)


@router.get("/{transaction_id}", response_model=TransactionResponse, summary="Consulter une transaction")
def get_transaction(
    transaction_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> TransactionResponse:
    return TransactionService(db).get_transaction(current_user["_id"], transaction_id)


@router.put("/{transaction_id}", response_model=TransactionResponse, summary="Modifier une transaction")
def update_transaction(
    transaction_id: str,
    payload: TransactionUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> TransactionResponse:
    return TransactionService(db).update_transaction(current_user["_id"], transaction_id, payload)


@router.delete("/{transaction_id}", response_model=MessageResponse, summary="Supprimer une transaction")
def delete_transaction(
    transaction_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> MessageResponse:
    TransactionService(db).delete_transaction(current_user["_id"], transaction_id)
    return MessageResponse(message="Transaction supprimée avec succès.")
