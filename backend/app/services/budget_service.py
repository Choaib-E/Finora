"""Service métier pour la gestion des budgets et alertes de dépassement."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from bson import ObjectId
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import ConflictException, NotFoundException
from app.database.mongo import COLLECTION_TRANSACTIONS
from app.repositories.budget_repository import BudgetRepository
from app.schemas.budget import AlertLevel, BudgetCreateRequest, BudgetResponse, BudgetUpdateRequest
from app.utils.object_id import normalize_object_id, parse_object_id, user_id_match


def _month_bounds(annee: int, mois: int) -> Tuple[datetime, datetime]:
    start = datetime(annee, mois, 1, tzinfo=timezone.utc)
    if mois == 12:
        end = datetime(annee + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(annee, mois + 1, 1, tzinfo=timezone.utc)
    return start, end


def _compute_alert(percentage: float) -> Tuple[AlertLevel, Optional[str]]:
    if percentage >= 100:
        if percentage > 100:
            return "exceeded", f"Budget dépassé ({percentage:.1f} % utilisé)."
        return "exceeded", "Budget atteint à 100 %."
    if percentage >= 90:
        return "critical", f"Alerte importante : {percentage:.1f} % du budget consommé."
    if percentage >= 75:
        return "warning", f"Avertissement : {percentage:.1f} % du budget consommé."
    return "ok", None


class BudgetService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = BudgetRepository(db)
        self.tx_collection = db[COLLECTION_TRANSACTIONS]

    def _compute_consumed_for_period(self, user_oid: ObjectId, annee: int, mois: int) -> Dict[str, float]:
        """Agrège les dépenses réelles par catégorie pour un mois/année donnés."""
        start, end = _month_bounds(annee, mois)
        pipeline = [
            {
                "$match": {
                    "user_id": user_id_match(user_oid),
                    "type": "depense",
                    "date": {"$gte": start, "$lt": end},
                }
            },
            {
                "$group": {
                    "_id": "$categorie",
                    "total": {"$sum": "$montant"},
                }
            },
        ]
        by_category: Dict[str, float] = {}
        total_all = 0.0
        for row in self.tx_collection.aggregate(pipeline):
            cat_name = str(row["_id"])
            val = round(float(row["total"]), 2)
            by_category[cat_name] = val
            total_all += val
        by_category["__TOTAL__"] = round(total_all, 2)
        return by_category

    def _serialize_budget(
        self,
        doc: Dict[str, Any],
        consumed_cache: Dict[Tuple[int, int], Dict[str, float]],
    ) -> BudgetResponse:
        owner_oid = normalize_object_id(doc["user_id"])
        key = (int(doc["annee"]), int(doc["mois"]))
        if key not in consumed_cache:
            consumed_cache[key] = self._compute_consumed_for_period(owner_oid, key[0], key[1])

        period_map = consumed_cache[key]
        categorie = doc["categorie"]
        if categorie.lower() == "global":
            consumed = period_map.get("__TOTAL__", 0.0)
        else:
            consumed = period_map.get(categorie, 0.0)

        limite = round(float(doc["montant_limite"]), 2)
        remaining = round(limite - consumed, 2)
        percentage = round((consumed / limite) * 100, 2) if limite > 0 else 0.0
        alert_level, alert_message = _compute_alert(percentage)

        return BudgetResponse(
            id=str(doc["_id"]),
            user_id=str(owner_oid),
            categorie=categorie,
            montant_limite=limite,
            periode=doc.get("periode", "mensuelle"),
            mois=int(doc["mois"]),
            annee=int(doc["annee"]),
            montant_consomme=consumed,
            montant_restant=remaining,
            pourcentage_utilise=percentage,
            alerte_niveau=alert_level,
            alerte_message=alert_message,
            created_at=doc["created_at"],
        )

    def list_budgets(
        self,
        user_oid: ObjectId,
        mois: Optional[int] = None,
        annee: Optional[int] = None,
    ) -> List[BudgetResponse]:
        docs = self.repo.list_by_user(user_oid, mois=mois, annee=annee)
        cache: Dict[Tuple[int, int], Dict[str, float]] = {}
        return [self._serialize_budget(doc, cache) for doc in docs]

    def create_budget(self, user_oid: ObjectId, payload: BudgetCreateRequest) -> BudgetResponse:
        try:
            doc = self.repo.create(
                user_oid=user_oid,
                categorie=payload.categorie,
                montant_limite=payload.montant_limite,
                periode=payload.periode,
                mois=payload.mois,
                annee=payload.annee,
            )
        except DuplicateKeyError as exc:
            raise ConflictException(
                f"Un budget existe déjà pour '{payload.categorie}' sur {payload.mois:02d}/{payload.annee}."
            ) from exc
        return self._serialize_budget(doc, {})

    def update_budget(
        self,
        user_oid: ObjectId,
        budget_id: str,
        payload: BudgetUpdateRequest,
    ) -> BudgetResponse:
        budget_oid = parse_object_id(budget_id, "budget")
        existing = self.repo.find_by_id_and_user(budget_oid, user_oid)
        if existing is None:
            raise NotFoundException("Budget introuvable.")

        updates: Dict[str, Any] = {}
        if payload.categorie is not None:
            updates["categorie"] = payload.categorie
        if payload.montant_limite is not None:
            updates["montant_limite"] = payload.montant_limite
        if payload.mois is not None:
            updates["mois"] = payload.mois
        if payload.annee is not None:
            updates["annee"] = payload.annee

        if not updates:
            return self._serialize_budget(existing, {})

        try:
            updated = self.repo.update(budget_oid, user_oid, updates)
        except DuplicateKeyError as exc:
            raise ConflictException("Un budget existe déjà pour cette catégorie et cette période.") from exc

        if updated is None:
            raise NotFoundException("Budget introuvable.")
        return self._serialize_budget(updated, {})

    def delete_budget(self, user_oid: ObjectId, budget_id: str) -> None:
        budget_oid = parse_object_id(budget_id, "budget")
        deleted = self.repo.delete(budget_oid, user_oid)
        if deleted == 0:
            raise NotFoundException("Budget introuvable.")
