"""Dépôt d'accès aux documents de la collection budgets."""

from typing import Any, Dict, List, Optional
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database

from app.database.mongo import COLLECTION_BUDGETS
from app.utils.formatters import utc_now
from app.utils.object_id import user_id_match


class BudgetRepository:
    def __init__(self, db: Database):
        self.collection = db[COLLECTION_BUDGETS]

    def list_by_user(
        self,
        user_oid: ObjectId,
        mois: Optional[int] = None,
        annee: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"user_id": user_id_match(user_oid)}
        if mois is not None:
            query["mois"] = mois
        if annee is not None:
            query["annee"] = annee
        return list(
            self.collection.find(query).sort(
                [("annee", DESCENDING), ("mois", DESCENDING), ("categorie", ASCENDING)]
            )
        )

    def find_by_id_and_user(self, budget_oid: ObjectId, user_oid: ObjectId) -> Optional[Dict[str, Any]]:
        return self.collection.find_one({"_id": budget_oid, "user_id": user_id_match(user_oid)})

    def create(
        self,
        user_oid: ObjectId,
        categorie: str,
        montant_limite: float,
        periode: str,
        mois: int,
        annee: int,
    ) -> Dict[str, Any]:
        doc: Dict[str, Any] = {
            "user_id": user_oid,
            "categorie": categorie.strip(),
            "montant_limite": round(float(montant_limite), 2),
            "periode": periode,
            "mois": mois,
            "annee": annee,
            "created_at": utc_now(),
        }
        result = self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    def update(self, budget_oid: ObjectId, user_oid: ObjectId, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self.collection.update_one({"_id": budget_oid, "user_id": user_id_match(user_oid)}, {"$set": updates})
        return self.find_by_id_and_user(budget_oid, user_oid)

    def delete(self, budget_oid: ObjectId, user_oid: ObjectId) -> int:
        result = self.collection.delete_one({"_id": budget_oid, "user_id": user_id_match(user_oid)})
        return result.deleted_count

    def rename_category_for_user(self, user_oid: ObjectId, old_name: str, new_name: str) -> None:
        self.collection.update_many(
            {"user_id": user_id_match(user_oid), "categorie": old_name},
            {"$set": {"categorie": new_name}},
        )
