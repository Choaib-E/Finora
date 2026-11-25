"""Service métier pour la gestion des catégories."""

from typing import Any, Dict, List, Optional, Tuple
from bson import ObjectId
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import ConflictException, NotFoundException
from app.repositories.budget_repository import BudgetRepository
from app.repositories.category_repository import CategoryRepository
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.category import CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest
from app.utils.object_id import parse_object_id


def serialize_category(doc: Dict[str, Any], transaction_count: int = 0) -> CategoryResponse:
    return CategoryResponse(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        nom=doc["nom"],
        type=doc["type"],
        couleur=doc["couleur"],
        transaction_count=transaction_count,
        created_at=doc["created_at"],
    )


class CategoryService:
    def __init__(self, db: Database):
        self.repo = CategoryRepository(db)
        self.tx_repo = TransactionRepository(db)
        self.budget_repo = BudgetRepository(db)

    def list_categories(self, user_oid: ObjectId, cat_type: Optional[str] = None) -> List[CategoryResponse]:
        docs = self.repo.list_by_user(user_oid, cat_type=cat_type)
        counts = self.tx_repo.count_by_category(user_oid)

        # Dédupliquer si la base existante contient une même catégorie avec user_id en ObjectId et en str
        by_key: Dict[Tuple[str, str], Dict[str, Any]] = {}
        for doc in docs:
            key = (doc["nom"], doc["type"])
            existing = by_key.get(key)
            if existing is None or (
                not isinstance(existing.get("user_id"), ObjectId) and isinstance(doc.get("user_id"), ObjectId)
            ):
                by_key[key] = doc

        ordered_keys = sorted(by_key.keys(), key=lambda k: (k[1], k[0].lower()))
        return [
            serialize_category(
                by_key[key],
                transaction_count=counts.get(key, 0),
            )
            for key in ordered_keys
        ]

    def create_category(self, user_oid: ObjectId, payload: CategoryCreateRequest) -> CategoryResponse:
        if self.repo.find_by_name_type_and_user(user_oid, payload.nom, payload.type) is not None:
            raise ConflictException(
                f"La catégorie '{payload.nom}' existe déjà pour le type '{payload.type}'."
            )
        try:
            doc = self.repo.create(
                user_oid=user_oid,
                nom=payload.nom,
                cat_type=payload.type,
                couleur=payload.couleur,
            )
        except DuplicateKeyError as exc:
            raise ConflictException(
                f"La catégorie '{payload.nom}' existe déjà pour le type '{payload.type}'."
            ) from exc
        counts = self.tx_repo.count_by_category(user_oid)
        return serialize_category(doc, transaction_count=counts.get((doc["nom"], doc["type"]), 0))

    def update_category(
        self,
        user_oid: ObjectId,
        cat_id: str,
        payload: CategoryUpdateRequest,
    ) -> CategoryResponse:
        cat_oid = parse_object_id(cat_id, "catégorie")
        existing = self.repo.find_by_id_and_user(cat_oid, user_oid)
        if existing is None:
            raise NotFoundException("Catégorie introuvable.")

        updates: Dict[str, Any] = {}
        if payload.nom is not None:
            updates["nom"] = payload.nom
        if payload.type is not None:
            updates["type"] = payload.type
        if payload.couleur is not None:
            updates["couleur"] = payload.couleur

        if not updates:
            counts = self.tx_repo.count_by_category(user_oid)
            return serialize_category(
                existing,
                transaction_count=counts.get((existing["nom"], existing["type"]), 0),
            )

        try:
            updated = self.repo.update(cat_oid, user_oid, updates)
        except DuplicateKeyError as exc:
            raise ConflictException("Une catégorie portant ce nom existe déjà pour ce type.") from exc

        if updated is None:
            raise NotFoundException("Catégorie introuvable.")

        new_name = updates.get("nom")
        if new_name and new_name != existing["nom"]:
            self.tx_repo.rename_category_for_user(
                user_oid=user_oid,
                old_name=existing["nom"],
                new_name=new_name,
                tx_type=existing["type"],
            )
            if existing["type"] == "depense":
                self.budget_repo.rename_category_for_user(
                    user_oid=user_oid,
                    old_name=existing["nom"],
                    new_name=new_name,
                )

        counts = self.tx_repo.count_by_category(user_oid)
        return serialize_category(
            updated,
            transaction_count=counts.get((updated["nom"], updated["type"]), 0),
        )

    def delete_category(self, user_oid: ObjectId, cat_id: str) -> None:
        cat_oid = parse_object_id(cat_id, "catégorie")
        deleted = self.repo.delete(cat_oid, user_oid)
        if deleted == 0:
            raise NotFoundException("Catégorie introuvable.")
