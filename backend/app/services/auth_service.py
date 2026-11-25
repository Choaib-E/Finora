"""Service d'authentification et de gestion du compte utilisateur."""

from typing import Any, Dict, Tuple
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import BadRequestException, ConflictException, UnauthorizedException
from app.core.security import create_access_token, hash_password, verify_password
from app.repositories.category_repository import CategoryRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    AuthTokenResponse,
    PasswordChangeRequest,
    UserLoginRequest,
    UserProfileUpdateRequest,
    UserRegisterRequest,
    UserResponse,
)


def serialize_user(doc: Dict[str, Any]) -> UserResponse:
    return UserResponse(
        id=str(doc["_id"]),
        Id=str(doc.get("Id", "")),
        name=doc["name"],
        email=doc["email"],
        role=doc.get("role", "user"),
        currency=doc.get("currency", "MAD"),
        created_at=doc["created_at"],
    )


class AuthService:
    def __init__(self, db: Database):
        self.db = db
        self.users = UserRepository(db)
        self.categories = CategoryRepository(db)

    def register(self, payload: UserRegisterRequest) -> AuthTokenResponse:
        existing = self.users.find_by_email(payload.email)
        if existing is not None:
            raise ConflictException("Un compte existe déjà avec cette adresse email.")

        password_hash = hash_password(payload.password)
        try:
            user_doc = self.users.create_user(
                name=payload.name,
                email=payload.email,
                password_hash=password_hash,
            )
        except DuplicateKeyError as exc:
            raise ConflictException("Un compte existe déjà avec ces informations.") from exc

        self.categories.seed_defaults_for_user(user_doc["_id"])

        token = create_access_token(
            subject=str(user_doc["_id"]),
            extra_claims={"Id": user_doc["Id"], "role": user_doc.get("role", "user")},
        )
        return AuthTokenResponse(access_token=token, user=serialize_user(user_doc))

    def login(self, payload: UserLoginRequest) -> AuthTokenResponse:
        user_doc = self.users.find_by_email(payload.email)
        if user_doc is None or not verify_password(payload.password, user_doc.get("password_hash", "")):
            raise UnauthorizedException("Email ou mot de passe incorrect.")

        token = create_access_token(
            subject=str(user_doc["_id"]),
            extra_claims={"Id": user_doc.get("Id", ""), "role": user_doc.get("role", "user")},
        )
        return AuthTokenResponse(access_token=token, user=serialize_user(user_doc))

    def update_profile(self, current_user: Dict[str, Any], payload: UserProfileUpdateRequest) -> UserResponse:
        existing_email = self.users.find_by_email(payload.email)
        if existing_email is not None and existing_email["_id"] != current_user["_id"]:
            raise ConflictException("Cette adresse email est déjà utilisée par un autre compte.")

        updated = self.users.update_profile(current_user["_id"], payload.name, payload.email)
        if updated is None:
            raise BadRequestException("Impossible de mettre à jour le profil.")
        return serialize_user(updated)

    def change_password(self, current_user: Dict[str, Any], payload: PasswordChangeRequest) -> Tuple[bool, str]:
        if not verify_password(payload.current_password, current_user.get("password_hash", "")):
            raise BadRequestException("Le mot de passe actuel est incorrect.")
        if payload.current_password == payload.new_password:
            raise BadRequestException("Le nouveau mot de passe doit être différent de l'ancien.")
        new_hash = hash_password(payload.new_password)
        self.users.update_password(current_user["_id"], new_hash)
        return True, "Mot de passe mis à jour avec succès."
