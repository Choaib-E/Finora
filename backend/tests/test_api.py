"""Tests d'intégration et d'isolation multi-utilisateurs pour Finora."""

from datetime import datetime, timezone
from bson import ObjectId


def _register(client, name: str, email: str, password: str = "Secret1234!"):
    resp = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_auth_lifecycle_and_no_forgot_password(client):
    u1 = _register(client, "Ahmed", "ahmed@example.com")
    assert u1["user"]["Id"] == "U001"
    assert u1["user"]["role"] == "admin"

    u2 = _register(client, "Salma", "salma@example.com")
    assert u2["user"]["Id"] == "U002"
    assert u2["user"]["role"] == "user"

    # Doublon email refusé
    dup = client.post(
        "/api/auth/register",
        json={"name": "Ahmed 2", "email": "ahmed@example.com", "password": "Secret1234!"},
    )
    assert dup.status_code == 409

    # Connexion valide + changement de mot de passe dans les paramètres
    login = client.post(
        "/api/auth/login",
        json={"email": "salma@example.com", "password": "Secret1234!"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    pwd_change = client.put(
        "/api/auth/me/password",
        headers=_auth_headers(token),
        json={"current_password": "Secret1234!", "new_password": "NewSecret1234!"},
    )
    assert pwd_change.status_code == 200

    # Endpoints mot de passe oublié bien supprimés
    assert client.post("/api/auth/forgot-password", json={"email": "salma@example.com"}).status_code == 404
    assert client.post("/api/auth/reset-password", json={"token": "x" * 20, "new_password": "y" * 10}).status_code == 404

    # Déconnexion révoque le token
    assert client.post("/api/auth/logout", headers=_auth_headers(token)).status_code == 200
    assert client.get("/api/auth/me", headers=_auth_headers(token)).status_code == 401


def test_strict_multi_user_isolation(client):
    u1 = _register(client, "Ahmed", "ahmed@example.com")
    u2 = _register(client, "Salma", "salma@example.com")
    h1 = _auth_headers(u1["access_token"])
    h2 = _auth_headers(u2["access_token"])

    tx_resp = client.post(
        "/api/transactions",
        headers=h1,
        json={
            "date": "2026-11-10",
            "montant": 450.0,
            "categorie": "Alimentation",
            "type": "depense",
            "description": "Courses Marjane",
        },
    )
    assert tx_resp.status_code == 201
    tx_id = tx_resp.json()["id"]

    cat_resp = client.post(
        "/api/categories",
        headers=h1,
        json={"nom": "Voyage", "type": "depense", "couleur": "#0EA5E9"},
    )
    assert cat_resp.status_code == 201
    cat_id = cat_resp.json()["id"]

    budget_resp = client.post(
        "/api/budgets",
        headers=h1,
        json={
            "categorie": "Alimentation",
            "montant_limite": 1500,
            "periode": "mensuelle",
            "mois": 11,
            "annee": 2026,
        },
    )
    assert budget_resp.status_code == 201
    budget_id = budget_resp.json()["id"]

    u2_txs = client.get("/api/transactions", headers=h2).json()
    assert u2_txs["total"] == 0
    assert client.get("/api/budgets", headers=h2).json() == []

    assert client.get(f"/api/transactions/{tx_id}", headers=h2).status_code == 404
    assert client.put(f"/api/transactions/{tx_id}", headers=h2, json={"montant": 10}).status_code == 404
    assert client.delete(f"/api/transactions/{tx_id}", headers=h2).status_code == 404
    assert client.delete(f"/api/categories/{cat_id}", headers=h2).status_code == 404
    assert client.delete(f"/api/budgets/{budget_id}", headers=h2).status_code == 404


def test_budgets_string_user_id_compatibility_and_dashboard_evolutions(client, mock_db):
    u1 = _register(client, "Choaib", "choaib@example.com")
    h1 = _auth_headers(u1["access_token"])
    user_id_str = u1["user"]["id"]

    # Simuler un budget existant dont user_id a été enregistré en chaîne (cas réel observé sur choaib.budgets)
    mock_db["budgets"].insert_one(
        {
            "user_id": user_id_str,
            "categorie": "Alimentation",
            "montant_limite": 1000,
            "periode": "mensuelle",
            "mois": 11,
            "annee": 2026,
            "created_at": datetime.now(timezone.utc),
        }
    )
    # Et une catégorie avec user_id en chaîne (dont une en doublon d'Alimentation)
    mock_db["categories"].insert_many(
        [
            {
                "user_id": user_id_str,
                "nom": "Vêtements",
                "type": "depense",
                "couleur": "#EC4899",
                "created_at": datetime.now(timezone.utc),
            },
            {
                "user_id": user_id_str,
                "nom": "Alimentation",
                "type": "depense",
                "couleur": "#F97316",
                "created_at": datetime.now(timezone.utc),
            },
        ]
    )

    txs = [
        {"date": "2026-10-01", "montant": 6000, "categorie": "Salaire", "type": "revenu", "description": "Salaire oct"},
        {"date": "2026-10-15", "montant": 1000, "categorie": "Alimentation", "type": "depense", "description": "Courses oct"},
        {"date": "2026-11-01", "montant": 9000, "categorie": "Salaire", "type": "revenu", "description": "Salaire nov"},
        {"date": "2026-11-05", "montant": 800, "categorie": "Alimentation", "type": "depense", "description": "Carrefour nov"},
        {"date": "2026-11-12", "montant": 400, "categorie": "Vêtements", "type": "depense", "description": "Zara"},
    ]
    for tx in txs:
        assert client.post("/api/transactions", headers=h1, json=tx).status_code == 201

    budgets = client.get("/api/budgets?mois=11&annee=2026", headers=h1).json()
    assert len(budgets) == 1
    assert budgets[0]["montant_consomme"] == 800.0
    assert budgets[0]["alerte_niveau"] == "warning"

    cats_list = client.get("/api/categories", headers=h1).json()
    assert len([c for c in cats_list if c["nom"] == "Alimentation" and c["type"] == "depense"]) == 1
    cats = {c["nom"]: c for c in cats_list}
    assert cats["Alimentation"]["transaction_count"] == 2
    assert cats["Vêtements"]["transaction_count"] == 1

    tx_list = client.get("/api/transactions?type=depense", headers=h1).json()
    assert tx_list["total"] == 3
    assert tx_list["total_depenses"] == 2200.0
    assert tx_list["total_revenus"] == 0.0

    dash = client.get("/api/dashboard?mois=11&annee=2026", headers=h1).json()
    assert dash["total_revenus"] == 15000.0
    assert dash["total_depenses"] == 2200.0
    assert dash["solde_total"] == 12800.0
    assert dash["revenus_mois"] == 9000.0
    assert dash["depenses_mois"] == 1200.0
    assert dash["transactions_mois"] == 3
    assert dash["revenus_evolution_pct"] == 50.0  # 9000 vs 6000
    assert dash["depenses_evolution_pct"] == 20.0  # 1200 vs 1000


def test_csv_import_mapping_deduplication_and_permissions(client, mock_db):
    u1 = _register(client, "Ahmed", "ahmed@example.com")
    u2 = _register(client, "Salma", "salma@example.com")
    h1 = _auth_headers(u1["access_token"])
    h2 = _auth_headers(u2["access_token"])

    csv_content = (
        "Id,date,montant,categorie,type,description\n"
        "U001,2026-01-01,250.50,Alimentation,depense,Courses Carrefour\n"
        "U002,2026-01-02,150.00,Transport,depense,Taxi\n"
        "U001,2026-01-03,5000.00,Salaire,revenu,Salaire mensuel\n"
        "U999,2026-01-04,100.00,Divers,depense,Inconnu\n"
        "U001,invalid-date,50.00,Transport,depense,Erreur date\n"
    ).encode("utf-8")

    forbidden_res = client.post(
        "/api/imports/csv",
        headers=h2,
        files={"file": ("test.csv", csv_content, "text/csv")},
    )
    assert forbidden_res.status_code == 200
    body_u2 = forbidden_res.json()
    assert body_u2["imported_count"] == 1
    assert body_u2["error_count"] >= 2

    admin_res = client.post(
        "/api/imports/csv",
        headers=h1,
        files={"file": ("test.csv", csv_content, "text/csv")},
    )
    assert admin_res.status_code == 200
    body_u1 = admin_res.json()
    assert body_u1["imported_count"] == 2
    assert body_u1["duplicates_skipped"] == 1
    assert body_u1["error_count"] == 2

    tx_docs = list(mock_db["transactions"].find({}))
    assert len(tx_docs) == 3
    for doc in tx_docs:
        assert isinstance(doc["user_id"], ObjectId)


def test_reports_and_exports(client):
    u1 = _register(client, "Ahmed", "ahmed@example.com")
    h1 = _auth_headers(u1["access_token"])

    client.post(
        "/api/transactions",
        headers=h1,
        json={"date": "2026-10-15", "montant": 6000, "categorie": "Salaire", "type": "revenu", "description": "Paie"},
    )
    client.post(
        "/api/transactions",
        headers=h1,
        json={"date": "2026-10-20", "montant": 1200, "categorie": "Logement", "type": "depense", "description": "Loyer"},
    )

    summary = client.get("/api/reports/summary", headers=h1)
    assert summary.status_code == 200
    data = summary.json()
    assert data["epargne_nette"] == 4800.0
    assert len(data["evolution_solde"]) == 2

    csv_export = client.get("/api/reports/export/csv", headers=h1)
    assert csv_export.status_code == 200
    assert "text/csv" in csv_export.headers["content-type"]
    assert "Loyer" in csv_export.text

    pdf_export = client.get("/api/reports/export/pdf", headers=h1)
    assert pdf_export.status_code == 200
    assert pdf_export.headers["content-type"] == "application/pdf"
    assert pdf_export.content.startswith(b"%PDF")


def test_mongo_uri_env_override(monkeypatch):
    from app.core.config import get_settings
    from app.database.mongo import get_mongo_uri

    get_settings.cache_clear()
    monkeypatch.setenv("MONGO_URI", "mongodb+srv://user:pass@cluster.example.mongodb.net/?retryWrites=true")
    assert get_mongo_uri() == "mongodb+srv://user:pass@cluster.example.mongodb.net/?retryWrites=true"
    get_settings.cache_clear()
