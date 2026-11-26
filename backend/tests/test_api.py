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


def test_nom_utilisateur_on_creation_rename_and_forgery_protection(client, mock_db):
    u1 = _register(client, "Ahmed Initial", "ahmed.nom@example.com")
    h1 = _auth_headers(u1["access_token"])
    user_oid = ObjectId(u1["user"]["id"])

    # Tentative d'injection de nom_utilisateur et user_id depuis le frontend : doit être ignorée
    tx1 = client.post(
        "/api/transactions",
        headers=h1,
        json={
            "date": "2026-11-10",
            "montant": 320.5,
            "categorie": "Alimentation",
            "type": "depense",
            "description": "Courses test",
            "nom_utilisateur": "Usurpateur",
            "user_id": "000000000000000000000000",
        },
    )
    assert tx1.status_code == 201, tx1.text
    tx1_body = tx1.json()
    assert tx1_body["user_id"] == u1["user"]["id"]
    assert tx1_body["nom_utilisateur"] == "Ahmed Initial"

    doc1 = mock_db["transactions"].find_one({"_id": ObjectId(tx1_body["id"])})
    assert doc1 is not None
    assert doc1["user_id"] == user_oid
    assert doc1["nom_utilisateur"] == "Ahmed Initial"

    # Changement de nom via PUT /api/auth/me -> la prochaine transaction doit utiliser le nouveau nom
    upd = client.put(
        "/api/auth/me",
        headers=h1,
        json={"name": "Ahmed Modifié", "email": "ahmed.nom@example.com"},
    )
    assert upd.status_code == 200, upd.text

    tx2 = client.post(
        "/api/transactions",
        headers=h1,
        json={
            "date": "2026-11-11",
            "montant": 150.0,
            "categorie": "Transport",
            "type": "depense",
            "description": "Tramway",
        },
    )
    assert tx2.status_code == 201, tx2.text
    assert tx2.json()["nom_utilisateur"] == "Ahmed Modifié"

    # Vérifier que l'import CSV renseigne également nom_utilisateur depuis utilisateurs
    csv_bytes = "Id,date,montant,categorie,type,description\nU001,2026-11-12,200.0,Loisirs,depense,Cinéma\n".encode("utf-8")
    imp = client.post("/api/imports/csv", headers=h1, files={"file": ("imp.csv", csv_bytes, "text/csv")})
    assert imp.status_code == 200
    assert imp.json()["imported_count"] == 1
    doc3 = mock_db["transactions"].find_one({"description": "Cinéma"})
    assert doc3 is not None
    assert doc3["nom_utilisateur"] == "Ahmed Modifié"

    # Vérifier la compatibilité des exports CSV et PDF
    assert client.get("/api/reports/export/csv", headers=h1).status_code == 200
    pdf_resp = client.get("/api/reports/export/pdf", headers=h1)
    assert pdf_resp.status_code == 200
    assert pdf_resp.content.startswith(b"%PDF")


def test_migration_nom_utilisateur_idempotent_and_non_destructive(mock_db, tmp_path):
    from scripts.backup_atlas_bson import backup_collections_bson
    from scripts.migrate_transactions_nom_utilisateur import migrate_transactions

    uid_choaib = ObjectId()
    uid_second = ObjectId()
    uid_other = ObjectId()
    uid_orphan = ObjectId()

    mock_db["utilisateurs"].insert_many(
        [
            {"_id": uid_choaib, "Id": "U001", "name": "choaib EL HACHIMI", "email": "choaib.mig@example.com"},
            {"_id": uid_second, "Id": "U002", "name": "Salma Bennani", "email": "salma.mig@example.com"},
            {"_id": uid_other, "Id": "U003", "name": "Youssef Alami", "email": "youssef.mig@example.com"},
        ]
    )

    dt1 = datetime(2026, 1, 1, tzinfo=timezone.utc)
    dt2 = datetime(2026, 2, 15, tzinfo=timezone.utc)
    created = datetime(2026, 2, 16, tzinfo=timezone.utc)

    id1 = mock_db["transactions"].insert_one(
        {
            "user_id": uid_choaib,
            "date": dt1,
            "montant": 250.5,
            "categorie": "Alimentation",
            "type": "depense",
            "description": "Courses Carrefour",
            "created_at": created,
        }
    ).inserted_id
    id2 = mock_db["transactions"].insert_one(
        {
            "user_id": str(uid_second),  # Ancien format user_id en chaîne
            "date": dt2,
            "montant": 5000.0,
            "categorie": "Salaire",
            "type": "revenu",
            "description": "Salaire février",
            "created_at": created,
        }
    ).inserted_id
    id_other = mock_db["transactions"].insert_one(
        {
            "user_id": uid_other,
            "nom_utilisateur": "Nom Déjà Présent",
            "date": dt2,
            "montant": 90.0,
            "categorie": "Transport",
            "type": "depense",
            "description": "Taxi",
            "created_at": created,
        }
    ).inserted_id
    id_orphan = mock_db["transactions"].insert_one(
        {
            "user_id": uid_orphan,  # Aucun utilisateur correspondant dans utilisateurs
            "date": dt2,
            "montant": 40.0,
            "categorie": "Divers",
            "type": "depense",
            "description": "Orpheline",
            "created_at": created,
        }
    ).inserted_id

    # Vérifier la sauvegarde BSON
    backup_summary = backup_collections_bson(mock_db, tmp_path / "bson_backup")
    assert backup_summary["transactions"]["documents_count"] == 4
    assert backup_summary["transactions"]["verified_bson_count"] == 4

    # Dry-run préalable
    dry = migrate_transactions(mock_db, dry_run=True)
    assert dry["total_before"] == 4
    assert dry["already_migrated_before"] == 1
    assert dry["to_migrate"] == 2
    assert dry["orphan_count"] == 1
    assert dry["modified_count"] == 0

    # Migration réelle : associe chaque transaction à son véritable utilisateur
    first = migrate_transactions(mock_db, dry_run=False)
    assert first["total_before"] == 4
    assert first["total_after"] == 4
    assert first["matched_count"] == 2
    assert first["modified_count"] == 2
    assert first["orphan_count"] == 1
    assert first["missing_after"] == 1  # uniquement la transaction orpheline

    doc1 = mock_db["transactions"].find_one({"_id": id1})
    doc2 = mock_db["transactions"].find_one({"_id": id2})
    doc_other = mock_db["transactions"].find_one({"_id": id_other})
    doc_orphan = mock_db["transactions"].find_one({"_id": id_orphan})
    assert doc1["nom_utilisateur"] == "choaib EL HACHIMI"
    assert doc1["user_id"] == uid_choaib
    assert doc1["montant"] == 250.5
    assert doc1["categorie"] == "Alimentation"
    assert doc1["description"] == "Courses Carrefour"
    assert doc2["nom_utilisateur"] == "Salma Bennani"
    assert doc_other["nom_utilisateur"] == "Nom Déjà Présent"  # jamais écrasé
    assert "nom_utilisateur" not in doc_orphan  # jamais un nom arbitraire

    # Seconde exécution : idempotente (0 modification)
    second = migrate_transactions(mock_db, dry_run=False)
    assert second["total_before"] == 4
    assert second["total_after"] == 4
    assert second["matched_count"] == 0
    assert second["modified_count"] == 0
    assert second["orphan_count"] == 1


def test_atlas_utils_encoding_masking_and_local_guard():
    from scripts.atlas_utils import build_atlas_uri_from_credentials, is_atlas_uri, mask_mongo_uri

    uri = build_atlas_uri_from_credentials("choaibelhachimi6_db_user", "P@ss:w0rd/100%#")
    assert "P%40ss%3Aw0rd%2F100%25%23" in uri
    assert "cluster0.qjm7fe7.mongodb.net/choaib" in uri
    assert is_atlas_uri(uri) is True
    assert is_atlas_uri("mongodb://localhost:27017/") is False
    assert is_atlas_uri("mongodb://127.0.0.1:27017/") is False
    masked = mask_mongo_uri(uri)
    assert "P@ss" not in masked
    assert "P%40ss" not in masked
    assert "choaibelhachimi6_db_user" not in masked
    assert "cluster0.qjm7fe7.mongodb.net" in masked
