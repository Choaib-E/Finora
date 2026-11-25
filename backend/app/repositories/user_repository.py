"""Dépôt d'accès aux documents de la collection utilisateurs."""

import re
from typing import Any, Dict, Optional
from bson import ObjectId
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.database.mongo import COLLECTION_UTILISATEURS
from app.utils.formatters import utc_now

_USER_CODE_PATTERN = re.compile(r"^U(\d+)$", re.IGNORECASE)


class UserRepository:
    def __init__(self, db: Database):
        self.collection = db[COLLECTION_UTILISATEURS]

    def find_by_id(self, user_oid: ObjectId) -> Optional[Dict[str, Any]]:
        return self.collection.find_one({"_id": user_oid})

    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return self.collection.find_one({"email": email.strip().lower()})

    def find_by_business_id(self, business_id: str) -> Optional[Dict[str, Any]]:
        return self.collection.find_one({"Id": business_id.strip().upper()})

    def count_users(self) -> int:
        return self.collection.count_documents({})

    def _compute_next_business_id(self) -> str:
        """Calcule le prochain identifiant métier séquentiel (U001, U002, ...)."""
        max_num = 0
        for doc in self.collection.find({}, {"Id": 1}):
            code = str(doc.get("Id", "")).strip()
            match = _USER_CODE_PATTERN.match(code)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num
        return f"U{max_num + 1:03d}"

    def create_user(
        self,
        name: str,
        email: str,
        password_hash: str,
        role: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Insère un nouvel utilisateur avec génération sécurisée de son Id métier unique."""
        assigned_role = role or ("admin" if self.count_users() == 0 else "user")

        for _ in range(5):
            business_id = self._compute_next_business_id()
            doc: Dict[str, Any] = {
                "Id": business_id,
                "name": name.strip(),
                "email": email.strip().lower(),
                "password_hash": password_hash,
                "role": assigned_role,
                "currency": "MAD",
                "created_at": utc_now(),
            }
            try:
                result = self.collection.insert_one(doc)
                doc["_id"] = result.inserted_id
                return doc
            except DuplicateKeyError as exc:
                err_msg = str(exc)
                if "email" in err_msg:
                    raise
                continue

        raise DuplicateKeyError("Impossible de générer un identifiant métier unique.")

    def update_profile(self, user_oid: ObjectId, name: str, email: str) -> Optional[Dict[str, Any]]:
        self.collection.update_one(
            {"_id": user_oid},
            {"$set": {"name": name.strip(), "email": email.strip().lower()}},
        )
        return self.find_by_id(user_oid)

    def update_password(self, user_oid: ObjectId, new_password_hash: str) -> None:
        self.collection.update_one(
            {"_id": user_oid},
            {"$set": {"password_hash": new_password_hash}},
        )
