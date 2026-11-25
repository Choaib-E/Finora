"""Utilitaires de sécurité : hachage Argon2 et gestion des tokens JWT."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Set
from uuid import uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import get_settings

_password_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=2,
)

# Liste en mémoire des identifiants jti révoqués lors de la déconnexion
_revoked_jti: Set[str] = set()


def hash_password(password: str) -> str:
    """Hache un mot de passe en clair avec Argon2id."""
    return _password_hasher.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Vérifie qu'un mot de passe correspond à son empreinte Argon2."""
    try:
        return _password_hasher.verify(password_hash, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def create_access_token(subject: str, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    """Génère un JWT signé contenant l'identifiant utilisateur (_id MongoDB)."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: Dict[str, Any] = {
        "sub": subject,
        "jti": str(uuid4()),
        "iat": now,
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def revoke_token_jti(jti: Optional[str]) -> None:
    """Révoque un identifiant de token lors de la déconnexion."""
    if jti:
        _revoked_jti.add(jti)


def is_token_revoked(jti: Optional[str]) -> bool:
    """Indique si le jti du token a été révoqué."""
    return bool(jti and jti in _revoked_jti)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Décode et valide un token JWT."""
    settings = get_settings()
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
