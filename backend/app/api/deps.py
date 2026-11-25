"""Dépendances d'authentification et d'accès à la base pour les routes FastAPI."""

from typing import Any, Dict, Optional
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.database import Database

from app.core.exceptions import UnauthorizedException
from app.core.security import decode_access_token, is_token_revoked
from app.database.mongo import get_db
from app.repositories.user_repository import UserRepository
from app.utils.object_id import parse_object_id

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_with_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Database = Depends(get_db),
) -> tuple[Dict[str, Any], Dict[str, Any]]:
    """Valide le JWT et charge le document utilisateur depuis MongoDB."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedException("Jeton d'authentification manquant.")

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedException("Session expirée. Veuillez vous reconnecter.") from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedException("Jeton d'authentification invalide.") from exc

    if is_token_revoked(payload.get("jti")):
        raise UnauthorizedException("Ce jeton a été révoqué. Veuillez vous reconnecter.")

    sub = payload.get("sub")
    if not sub:
        raise UnauthorizedException("Jeton d'authentification incomplet.")

    user_oid = parse_object_id(sub, "utilisateur")
    user_doc = UserRepository(db).find_by_id(user_oid)
    if user_doc is None:
        raise UnauthorizedException("Utilisateur introuvable ou supprimé.")

    return user_doc, payload


def get_current_user(
    auth_data: tuple[Dict[str, Any], Dict[str, Any]] = Depends(get_current_user_with_token),
) -> Dict[str, Any]:
    """Retourne le document utilisateur authentifié depuis le JWT (jamais depuis le frontend)."""
    return auth_data[0]
