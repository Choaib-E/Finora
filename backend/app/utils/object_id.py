"""Utilitaires de conversion, validation et filtrage sur ObjectId MongoDB."""

from typing import Any, Dict
from bson import ObjectId
from bson.errors import InvalidId

from app.core.exceptions import BadRequestException


def parse_object_id(value: str, field_name: str = "identifiant") -> ObjectId:
    """Convertit une chaîne hexadécimale en ObjectId ou lève une erreur 400."""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError) as exc:
        raise BadRequestException(f"Format de {field_name} invalide.") from exc


def normalize_object_id(value: Any) -> ObjectId:
    """Convertit un ObjectId ou une chaîne hexadécimale en ObjectId."""
    if isinstance(value, ObjectId):
        return value
    return parse_object_id(str(value), "utilisateur")


def user_id_match(user_oid: ObjectId) -> Dict[str, Any]:
    """
    Filtre MongoDB tolérant les documents historiques où user_id a été enregistré
    soit en ObjectId, soit en chaîne hexadécimale, tout en isolant strictement l'utilisateur.
    """
    return {"$in": [user_oid, str(user_oid)]}
