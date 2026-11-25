"""Routes API pour la gestion des catégories."""

from typing import Any, Dict, List, Literal, Optional
from fastapi import APIRouter, Depends, Query, status
from pymongo.database import Database

from app.api.deps import get_current_user
from app.database.mongo import get_db
from app.schemas.auth import MessageResponse
from app.schemas.category import CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Catégories"])


@router.get("", response_model=List[CategoryResponse], summary="Lister les catégories de l'utilisateur")
def list_categories(
    type: Optional[Literal["revenu", "depense"]] = Query(default=None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> List[CategoryResponse]:
    return CategoryService(db).list_categories(current_user["_id"], cat_type=type)


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer une catégorie personnalisée",
)
def create_category(
    payload: CategoryCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> CategoryResponse:
    return CategoryService(db).create_category(current_user["_id"], payload)


@router.put("/{category_id}", response_model=CategoryResponse, summary="Modifier une catégorie")
def update_category(
    category_id: str,
    payload: CategoryUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> CategoryResponse:
    return CategoryService(db).update_category(current_user["_id"], category_id, payload)


@router.delete("/{category_id}", response_model=MessageResponse, summary="Supprimer une catégorie")
def delete_category(
    category_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> MessageResponse:
    CategoryService(db).delete_category(current_user["_id"], category_id)
    return MessageResponse(message="Catégorie supprimée avec succès.")
