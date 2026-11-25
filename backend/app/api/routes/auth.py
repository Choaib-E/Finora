"""Routes d'authentification et de gestion du profil utilisateur."""

from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from pymongo.database import Database

from app.api.deps import get_current_user, get_current_user_with_token
from app.core.security import revoke_token_jti
from app.database.mongo import get_db
from app.schemas.auth import (
    AuthTokenResponse,
    MessageResponse,
    PasswordChangeRequest,
    UserLoginRequest,
    UserProfileUpdateRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth_service import AuthService, serialize_user

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post(
    "/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un nouveau compte utilisateur",
)
def register(payload: UserRegisterRequest, db: Database = Depends(get_db)) -> AuthTokenResponse:
    return AuthService(db).register(payload)


@router.post(
    "/login",
    response_model=AuthTokenResponse,
    summary="Connexion utilisateur et génération de JWT",
)
def login(payload: UserLoginRequest, db: Database = Depends(get_db)) -> AuthTokenResponse:
    return AuthService(db).login(payload)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Déconnexion et révocation du token courant",
)
def logout(
    auth_data: tuple[Dict[str, Any], Dict[str, Any]] = Depends(get_current_user_with_token),
) -> MessageResponse:
    _, payload = auth_data
    revoke_token_jti(payload.get("jti"))
    return MessageResponse(message="Déconnexion effectuée avec succès.")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Consulter le profil de l'utilisateur connecté",
)
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)) -> UserResponse:
    return serialize_user(current_user)


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Mettre à jour le profil de l'utilisateur connecté",
)
def update_me(
    payload: UserProfileUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> UserResponse:
    return AuthService(db).update_profile(current_user, payload)


@router.put(
    "/me/password",
    response_model=MessageResponse,
    summary="Modifier le mot de passe de l'utilisateur connecté",
)
def change_password(
    payload: PasswordChangeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> MessageResponse:
    _, msg = AuthService(db).change_password(current_user, payload)
    return MessageResponse(message=msg)
