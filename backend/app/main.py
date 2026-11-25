"""Point d'entrée principal de l'API FastAPI Finora."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, budgets, categories, dashboard, imports, reports, transactions
from app.core.config import get_settings
from app.database.mongo import EXPECTED_COLLECTIONS, mongo_manager


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Connexion à la base MongoDB existante (choaib) au démarrage
    mongo_manager.connect()
    yield
    mongo_manager.close()


settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API REST multi-utilisateurs Finora de gestion des finances personnelles (MAD) "
        "connectée à la base MongoDB choaib."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(transactions.router, prefix=API_PREFIX)
app.include_router(categories.router, prefix=API_PREFIX)
app.include_router(budgets.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(imports.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)


@app.get("/api/health", tags=["Système"], summary="Vérification de l'état de l'API et de MongoDB")
def health_check():
    db = mongo_manager.get_database()
    db.client.admin.command("ping")
    collections = db.list_collection_names()
    return {
        "status": "ok",
        "database": db.name,
        "collections_present": [c for c in EXPECTED_COLLECTIONS if c in collections],
    }
