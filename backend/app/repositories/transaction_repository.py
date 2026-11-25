"""Dépôt d'accès aux documents de la collection transactions."""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database

from app.database.mongo import COLLECTION_TRANSACTIONS
from app.utils.formatters import utc_now
from app.utils.object_id import user_id_match


class TransactionRepository:
    def __init__(self, db: Database):
        self.collection = db[COLLECTION_TRANSACTIONS]

    def build_filter_query(
        self,
        user_oid: ObjectId,
        search: Optional[str] = None,
        tx_type: Optional[str] = None,
        categorie: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {"user_id": user_id_match(user_oid)}
        if tx_type:
            query["type"] = tx_type
        if categorie:
            query["categorie"] = categorie
        if date_from or date_to:
            date_filter: Dict[str, Any] = {}
            if date_from:
                date_filter["$gte"] = date_from
            if date_to:
                date_filter["$lte"] = date_to
            query["date"] = date_filter
        if search:
            escaped = re.escape(search.strip())
            if escaped:
                query["$or"] = [
                    {"description": {"$regex": escaped, "$options": "i"}},
                    {"categorie": {"$regex": escaped, "$options": "i"}},
                ]
        return query

    def summarize_filtered_totals(self, query: Dict[str, Any]) -> Tuple[float, float]:
        pipeline = [
            {"$match": query},
            {"$group": {"_id": "$type", "total": {"$sum": "$montant"}}},
        ]
        revenus = 0.0
        depenses = 0.0
        for row in self.collection.aggregate(pipeline):
            if row["_id"] == "revenu":
                revenus = round(float(row["total"]), 2)
            elif row["_id"] == "depense":
                depenses = round(float(row["total"]), 2)
        return revenus, depenses

    def list_by_user(
        self,
        user_oid: ObjectId,
        search: Optional[str] = None,
        tx_type: Optional[str] = None,
        categorie: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        sort_by: str = "date",
        sort_order: str = "desc",
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int, float, float]:
        query = self.build_filter_query(
            user_oid=user_oid,
            search=search,
            tx_type=tx_type,
            categorie=categorie,
            date_from=date_from,
            date_to=date_to,
        )
        direction = DESCENDING if sort_order == "desc" else ASCENDING
        sort_field = "montant" if sort_by == "montant" else "date"

        total = self.collection.count_documents(query)
        total_revenus, total_depenses = self.summarize_filtered_totals(query)
        skip = (page - 1) * limit
        cursor = (
            self.collection.find(query)
            .sort([(sort_field, direction), ("created_at", DESCENDING)])
            .skip(skip)
            .limit(limit)
        )
        return list(cursor), total, total_revenus, total_depenses

    def list_all_for_export(
        self,
        user_oid: ObjectId,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        tx_type: Optional[str] = None,
        categorie: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = self.build_filter_query(
            user_oid=user_oid,
            tx_type=tx_type,
            categorie=categorie,
            date_from=date_from,
            date_to=date_to,
        )
        return list(self.collection.find(query).sort([("date", DESCENDING), ("created_at", DESCENDING)]))

    def find_by_id_and_user(self, tx_oid: ObjectId, user_oid: ObjectId) -> Optional[Dict[str, Any]]:
        return self.collection.find_one({"_id": tx_oid, "user_id": user_id_match(user_oid)})

    def exists_duplicate(
        self,
        user_oid: ObjectId,
        tx_date: datetime,
        montant: float,
        categorie: str,
        tx_type: str,
        description: str,
    ) -> bool:
        return (
            self.collection.find_one(
                {
                    "user_id": user_id_match(user_oid),
                    "date": tx_date,
                    "montant": montant,
                    "categorie": categorie,
                    "type": tx_type,
                    "description": description,
                },
                {"_id": 1},
            )
            is not None
        )

    def create(
        self,
        user_oid: ObjectId,
        tx_date: datetime,
        montant: float,
        categorie: str,
        tx_type: str,
        description: str,
    ) -> Dict[str, Any]:
        doc: Dict[str, Any] = {
            "user_id": user_oid,
            "date": tx_date,
            "montant": round(float(montant), 2),
            "categorie": categorie.strip(),
            "type": tx_type,
            "description": description.strip(),
            "created_at": utc_now(),
        }
        result = self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    def update(self, tx_oid: ObjectId, user_oid: ObjectId, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self.collection.update_one({"_id": tx_oid, "user_id": user_id_match(user_oid)}, {"$set": updates})
        return self.find_by_id_and_user(tx_oid, user_oid)

    def delete(self, tx_oid: ObjectId, user_oid: ObjectId) -> int:
        result = self.collection.delete_one({"_id": tx_oid, "user_id": user_id_match(user_oid)})
        return result.deleted_count

    def rename_category_for_user(self, user_oid: ObjectId, old_name: str, new_name: str, tx_type: str) -> None:
        self.collection.update_many(
            {"user_id": user_id_match(user_oid), "categorie": old_name, "type": tx_type},
            {"$set": {"categorie": new_name}},
        )

    def count_by_category(self, user_oid: ObjectId) -> Dict[Tuple[str, str], int]:
        pipeline = [
            {"$match": {"user_id": user_id_match(user_oid)}},
            {"$group": {"_id": {"categorie": "$categorie", "type": "$type"}, "count": {"$sum": 1}}},
        ]
        counts: Dict[Tuple[str, str], int] = {}
        for row in self.collection.aggregate(pipeline):
            key = (str(row["_id"].get("categorie", "")), str(row["_id"].get("type", "")))
            counts[key] = int(row.get("count", 0))
        return counts
