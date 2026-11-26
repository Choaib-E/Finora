"""Service métier pour la gestion des transactions."""

from datetime import date, datetime, time, timezone
from math import ceil
from typing import Any, Dict, Optional
from bson import ObjectId
from pymongo.database import Database

from app.core.exceptions import BadRequestException, NotFoundException
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.transaction import (
    TransactionCreateRequest,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdateRequest,
)
from app.utils.object_id import parse_object_id


def _date_to_utc_start(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def _date_to_utc_end(d: date) -> datetime:
    return datetime.combine(d, time.max, tzinfo=timezone.utc)


def serialize_transaction(doc: Dict[str, Any]) -> TransactionResponse:
    return TransactionResponse(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        nom_utilisateur=doc.get("nom_utilisateur"),
        date=doc["date"],
        montant=round(float(doc["montant"]), 2),
        categorie=doc["categorie"],
        type=doc["type"],
        description=doc.get("description", ""),
        created_at=doc["created_at"],
    )


class TransactionService:
    def __init__(self, db: Database):
        self.repo = TransactionRepository(db)
        self.user_repo = UserRepository(db)

    def list_transactions(
        self,
        user_oid: ObjectId,
        search: Optional[str] = None,
        tx_type: Optional[str] = None,
        categorie: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        sort_by: str = "date",
        sort_order: str = "desc",
        page: int = 1,
        limit: int = 50,
    ) -> TransactionListResponse:
        if date_from and date_to and date_from > date_to:
            raise BadRequestException("La date de début doit précéder la date de fin.")

        dt_from = _date_to_utc_start(date_from) if date_from else None
        dt_to = _date_to_utc_end(date_to) if date_to else None

        docs, total, total_revenus, total_depenses = self.repo.list_by_user(
            user_oid=user_oid,
            search=search,
            tx_type=tx_type,
            categorie=categorie,
            date_from=dt_from,
            date_to=dt_to,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            limit=limit,
        )
        total_pages = max(1, ceil(total / limit)) if total > 0 else 1
        return TransactionListResponse(
            items=[serialize_transaction(doc) for doc in docs],
            total=total,
            total_revenus=total_revenus,
            total_depenses=total_depenses,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    def get_transaction(self, user_oid: ObjectId, tx_id: str) -> TransactionResponse:
        tx_oid = parse_object_id(tx_id, "transaction")
        doc = self.repo.find_by_id_and_user(tx_oid, user_oid)
        if doc is None:
            raise NotFoundException("Transaction introuvable.")
        return serialize_transaction(doc)

    def create_transaction(
        self,
        user_oid: ObjectId,
        payload: TransactionCreateRequest,
        nom_utilisateur: Optional[str] = None,
    ) -> TransactionResponse:
        resolved_name = nom_utilisateur.strip() if nom_utilisateur is not None else ""
        if not resolved_name:
            user_doc = self.user_repo.find_by_id(user_oid)
            resolved_name = str(user_doc.get("name", "")).strip() if user_doc else ""

        doc = self.repo.create(
            user_oid=user_oid,
            nom_utilisateur=resolved_name,
            tx_date=_date_to_utc_start(payload.date),
            montant=payload.montant,
            categorie=payload.categorie,
            tx_type=payload.type,
            description=payload.description,
        )
        return serialize_transaction(doc)

    def update_transaction(
        self,
        user_oid: ObjectId,
        tx_id: str,
        payload: TransactionUpdateRequest,
    ) -> TransactionResponse:
        tx_oid = parse_object_id(tx_id, "transaction")
        existing = self.repo.find_by_id_and_user(tx_oid, user_oid)
        if existing is None:
            raise NotFoundException("Transaction introuvable.")

        updates: Dict[str, Any] = {}
        if payload.date is not None:
            updates["date"] = _date_to_utc_start(payload.date)
        if payload.montant is not None:
            updates["montant"] = payload.montant
        if payload.categorie is not None:
            updates["categorie"] = payload.categorie
        if payload.type is not None:
            updates["type"] = payload.type
        if payload.description is not None:
            updates["description"] = payload.description

        if not updates:
            return serialize_transaction(existing)

        updated = self.repo.update(tx_oid, user_oid, updates)
        if updated is None:
            raise NotFoundException("Transaction introuvable.")
        return serialize_transaction(updated)

    def delete_transaction(self, user_oid: ObjectId, tx_id: str) -> None:
        tx_oid = parse_object_id(tx_id, "transaction")
        deleted = self.repo.delete(tx_oid, user_oid)
        if deleted == 0:
            raise NotFoundException("Transaction introuvable.")
