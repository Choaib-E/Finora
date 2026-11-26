"""
Utilitaires communs sécurisés pour les opérations Atlas (connexion, masquage d'URI, encodage).

Ne journalise ni n'affiche jamais le mot de passe ni les identifiants dans les logs.
"""

import getpass
import os
from typing import Tuple
from urllib.parse import quote_plus, urlsplit

from pymongo import MongoClient

ATLAS_CLUSTER_HOST = "cluster0.qjm7fe7.mongodb.net"
DEFAULT_DB_NAME = "choaib"


def is_atlas_uri(uri: str) -> bool:
    """Vérifie qu'une URI cible bien MongoDB Atlas et non une instance locale."""
    if not uri:
        return False
    parsed = urlsplit(uri)
    host = (parsed.hostname or "").lower()
    if host in {"", "localhost", "127.0.0.1", "::1"}:
        return False
    return uri.startswith("mongodb+srv://") or "mongodb.net" in host


def mask_mongo_uri(uri: str) -> str:
    """Retourne une représentation sans identifiants ni mot de passe d'une URI MongoDB."""
    if not uri:
        return "<vide>"
    parsed = urlsplit(uri)
    host = parsed.hostname or "<inconnu>"
    port = f":{parsed.port}" if parsed.port else ""
    path = parsed.path or ""
    return f"{parsed.scheme}://***:***@{host}{port}{path}"


def extract_cluster_host(uri: str) -> str:
    parsed = urlsplit(uri)
    return parsed.hostname or "<inconnu>"


def build_atlas_uri_from_credentials(
    username: str,
    password: str,
    cluster_host: str = ATLAS_CLUSTER_HOST,
    db_name: str = DEFAULT_DB_NAME,
) -> str:
    """Construit une URI mongodb+srv en encodant proprement les caractères spéciaux."""
    enc_user = quote_plus(username.strip())
    enc_pass = quote_plus(password)
    return f"mongodb+srv://{enc_user}:{enc_pass}@{cluster_host}/{db_name}?retryWrites=true&w=majority"


def resolve_atlas_connection(
    prompt_if_missing: bool = False,
    cluster_host: str = ATLAS_CLUSTER_HOST,
    db_name: str = DEFAULT_DB_NAME,
) -> Tuple[str, str]:
    """
    Résout l'URI Atlas depuis MONGO_URI / MONGODB_URI (variable d'environnement temporaire),
    ou invite l'utilisateur à saisir ses identifiants de manière masquée en mémoire.
    Refuse toute URI locale (localhost / 127.0.0.1).
    """
    uri = (os.getenv("MONGO_URI") or os.getenv("MONGODB_URI") or "").strip()
    target_db = (os.getenv("MONGO_DATABASE") or os.getenv("MONGODB_DATABASE") or db_name).strip() or db_name

    if not uri:
        env_user = (os.getenv("ATLAS_USERNAME") or "").strip()
        env_pass = os.getenv("ATLAS_PASSWORD") or ""
        if env_user and env_pass:
            uri = build_atlas_uri_from_credentials(env_user, env_pass, cluster_host=cluster_host, db_name=target_db)
        elif prompt_if_missing:
            print(f"Connexion requise au cluster MongoDB Atlas ({cluster_host}, base '{target_db}').")
            username = input("Nom d'utilisateur MongoDB Atlas : ").strip()
            password = getpass.getpass("Mot de passe MongoDB Atlas (saisie masquée) : ")
            if not username or not password:
                raise RuntimeError("Identifiants Atlas incomplets.")
            uri = build_atlas_uri_from_credentials(username, password, cluster_host=cluster_host, db_name=target_db)

    if not uri:
        raise RuntimeError(
            "Aucune URI MongoDB Atlas fournie. Définissez temporairement $env:MONGO_URI "
            "ou relancez avec --prompt pour saisir les identifiants de façon masquée."
        )

    if not is_atlas_uri(uri):
        raise RuntimeError(
            f"Sécurité : l'URI détectée ({mask_mongo_uri(uri)}) pointe vers une instance locale/non-Atlas. "
            "Migration Atlas annulée pour ne pas confondre local et Atlas."
        )

    return uri, target_db


def connect_atlas_verified(uri: str, db_name: str) -> MongoClient:
    """Ouvre un MongoClient vers Atlas, vérifie le ping et confirme qu'il s'agit bien d'un cluster distant."""
    client = MongoClient(uri, serverSelectionTimeoutMS=10000, connectTimeoutMS=10000)
    hello = client.admin.command("hello")
    me_host = str(hello.get("me", ""))
    if "localhost" in me_host.lower() or "127.0.0.1" in me_host:
        client.close()
        raise RuntimeError(f"Sécurité : le serveur joint ({me_host}) semble local, pas MongoDB Atlas.")
    # Vérifier que la base est accessible
    _ = client[db_name].list_collection_names()
    return client
