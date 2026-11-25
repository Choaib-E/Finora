"""Dépôt d'accès aux documents de la collection categories."""

from typing import Any, Dict, List, Optional
from bson import ObjectId
from pymongo import ASCENDING
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.database.mongo import COLLECTION_CATEGORIES
from app.models.defaults import DEFAULT_CATEGORIES
from app.utils.formatters import utc_now
from app.utils.object_id import user_id_match


class CategoryRepository:
    def __init__(self, db: Database):
        self.collection = db[COLLECTION_CATEGORIES]

    def list_by_user(self, user_oid: ObjectId, cat_type: Optional[str] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"user_id": user_id_match(user_oid)}
        if cat_type:
            query["type"] = cat_type
        return list(self.collection.find(query).sort([("type", ASCENDING), ("nom", ASCENDING)]))

    def find_by_id_and_user(self, cat_oid: ObjectId, user_oid: ObjectId) -> Optional[Dict[str, Any]]:
        return self.collection.find_one({"_id": cat_oid, "user_id": user_id_match(user_oid)})

    def find_by_name_type_and_user(self, user_oid: ObjectId, nom: str, cat_type: str) -> Optional[Dict[str, Any]]:
        return self.collection.find_one(
            {"user_id": user_id_match(user_oid), "nom": nom.strip(), "type": cat_type}
        )

    def create(self, user_oid: ObjectId, nom: str, cat_type: str, couleur: str) -> Dict[str, Any]:
        doc: Dict[str, Any] = {
            "user_id": user_oid,
            "nom": nom.strip(),
            "type": cat_type,
            "couleur": couleur.upper(),
            "created_at": utc_now(),
        }
        result = self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    def update(self, cat_oid: ObjectId, user_oid: ObjectId, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self.collection.update_one({"_id": cat_oid, "user_id": user_id_match(user_oid)}, {"$set": updates})
        return self.find_by_id_and_user(cat_oid, user_oid)

    def delete(self, cat_oid: ObjectId, user_oid: ObjectId) -> int:
        result = self.collection.delete_one({"_id": cat_oid, "user_id": user_id_match(user_oid)})
        return result.deleted_count

    def seed_defaults_for_user(self, user_oid: ObjectId) -> int:
        """Initialise les catégories par défaut pour un nouvel utilisateur sans écraser d'éventuels doublons."""
        inserted = 0
        now = utc_now()
        for item in DEFAULT_CATEGORIES:
            try:
                self.collection.insert_one(
                    {
                        "user_id": user_oid,
                        "nom": item["nom"],
                        "type": item["type"],
                        "couleur": item["couleur"],
                        "created_at": now,
                    }
                )
                inserted += 1
            except DuplicateKeyError:
                continue
        return inserted
