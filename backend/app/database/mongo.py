"""Connexion MongoDB et accès sécurisé aux 4 collections existantes de choaib."""

from typing import Optional
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from app.core.config import get_settings

COLLECTION_UTILISATEURS = "utilisateurs"
COLLECTION_TRANSACTIONS = "transactions"
COLLECTION_CATEGORIES = "categories"
COLLECTION_BUDGETS = "budgets"

EXPECTED_COLLECTIONS = (
    COLLECTION_UTILISATEURS,
    COLLECTION_TRANSACTIONS,
    COLLECTION_CATEGORIES,
    COLLECTION_BUDGETS,
)


class MongoManager:
    """Gestionnaire singleton de la connexion PyMongo vers la base existante."""

    client: Optional[MongoClient] = None
    db: Optional[Database] = None

    def connect(self) -> Database:
        if self.db is not None:
            return self.db
        settings = get_settings()
        self.client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
        self.client.admin.command("ping")
        self.db = self.client[settings.MONGODB_DATABASE]
        self.ensure_indexes(self.db)
        return self.db

    def close(self) -> None:
        if self.client is not None:
            self.client.close()
            self.client = None
            self.db = None

    def get_database(self) -> Database:
        if self.db is None:
            return self.connect()
        return self.db

    @staticmethod
    def ensure_indexes(db: Database) -> None:
        """Crée les index nécessaires sur les collections existantes sans jamais les recréer ni supprimer de données."""
        utilisateurs = db[COLLECTION_UTILISATEURS]
        utilisateurs.create_index([("Id", ASCENDING)], unique=True, name="idx_utilisateurs_id_unique")
        utilisateurs.create_index([("email", ASCENDING)], unique=True, name="idx_utilisateurs_email_unique")

        transactions = db[COLLECTION_TRANSACTIONS]
        transactions.create_index([("user_id", ASCENDING), ("date", DESCENDING)], name="idx_transactions_user_date")
        transactions.create_index([("user_id", ASCENDING), ("categorie", ASCENDING)], name="idx_transactions_user_categorie")
        transactions.create_index([("user_id", ASCENDING), ("type", ASCENDING)], name="idx_transactions_user_type")

        categories = db[COLLECTION_CATEGORIES]
        categories.create_index(
            [("user_id", ASCENDING), ("type", ASCENDING), ("nom", ASCENDING)],
            unique=True,
            name="idx_categories_user_type_nom_unique",
        )

        budgets = db[COLLECTION_BUDGETS]
        budgets.create_index(
            [("user_id", ASCENDING), ("annee", ASCENDING), ("mois", ASCENDING), ("categorie", ASCENDING)],
            unique=True,
            name="idx_budgets_user_periode_categorie_unique",
        )


mongo_manager = MongoManager()


def get_db() -> Database:
    """Dépendance FastAPI retournant l'instance de la base MongoDB."""
    return mongo_manager.get_database()


def get_collection(db: Database, name: str) -> Collection:
    return db[name]
