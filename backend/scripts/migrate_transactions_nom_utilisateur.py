"""
Migration idempotente : ajout du champ `nom_utilisateur` sur la collection `transactions`
par correspondance stricte `transactions.user_id -> utilisateurs._id`.

Règles strictes :
- Ne suppose jamais que toutes les transactions appartiennent au même utilisateur.
- Pour chaque transaction sans `nom_utilisateur`, recherche le véritable utilisateur
  dans `utilisateurs` à partir de `user_id` (en tolérant ObjectId et str hexadécimale).
- Si l'utilisateur correspondant est introuvable (ou sans nom), la transaction est
  signalée sans recevoir de nom arbitraire et sans être modifiée.
- Ne modifie aucun document possédant déjà un `nom_utilisateur` non vide.
- Ne modifie aucun autre champ (_id, user_id, date, montant, categorie, type, description, created_at).
- Idempotente : plusieurs exécutions successives donnent 0 modification supplémentaire.

Utilisation (Atlas via variable d'environnement temporaire ou --prompt) :
    cd backend
    .\\.venv\\Scripts\\python.exe -m scripts.migrate_transactions_nom_utilisateur --atlas --prompt --dry-run
"""

import argparse
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database.mongo import (  # noqa: E402
    COLLECTION_TRANSACTIONS,
    COLLECTION_UTILISATEURS,
    get_mongo_uri,
)
from scripts.atlas_utils import (  # noqa: E402
    connect_atlas_verified,
    extract_cluster_host,
    is_atlas_uri,
    mask_mongo_uri,
    resolve_atlas_connection,
)


def missing_nom_utilisateur_filter() -> Dict[str, Any]:
    """Sélectionne uniquement les transactions sans valeur `nom_utilisateur`."""
    return {
        "$or": [
            {"nom_utilisateur": {"$exists": False}},
            {"nom_utilisateur": None},
            {"nom_utilisateur": ""},
        ]
    }


def _has_valid_nom_utilisateur(doc: Dict[str, Any]) -> bool:
    val = doc.get("nom_utilisateur")
    return isinstance(val, str) and bool(val.strip())


def inspect_and_migrate_transactions(
    db: Database,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Audite et migre de façon idempotente la collection `transactions` en faisant
    correspondre chaque `user_id` au document réel dans `utilisateurs`.
    """
    transactions = db[COLLECTION_TRANSACTIONS]
    utilisateurs = db[COLLECTION_UTILISATEURS]

    # Index en mémoire des utilisateurs par str(_id)
    users_by_id: Dict[str, Dict[str, Any]] = {}
    for user_doc in utilisateurs.find({}, {"_id": 1, "Id": 1, "name": 1}):
        users_by_id[str(user_doc["_id"])] = {
            "oid_str": str(user_doc["_id"]),
            "Id": str(user_doc.get("Id", "")),
            "name": str(user_doc.get("name", "")).strip(),
        }

    all_txs = list(
        transactions.find(
            {},
            {"_id": 1, "user_id": 1, "nom_utilisateur": 1, "type": 1, "montant": 1},
        )
    )

    total_before = len(all_txs)
    already_migrated = 0
    to_migrate_count = 0
    orphan_transactions: List[Dict[str, str]] = []
    per_user_stats: Dict[str, Dict[str, Any]] = defaultdict(
        lambda: {
            "user_id": "",
            "user_code": "",
            "user_name": None,
            "total": 0,
            "already_migrated": 0,
            "to_migrate": 0,
            "orphan": False,
        }
    )
    name_mismatches_existing: List[Dict[str, str]] = []

    revenus_count = 0
    depenses_count = 0
    total_revenus = 0.0
    total_depenses = 0.0

    ids_by_resolved_name: Dict[str, List[Any]] = defaultdict(list)
    missing_filter = missing_nom_utilisateur_filter()

    for tx in all_txs:
        tx_type = tx.get("type")
        amount = float(tx.get("montant", 0.0) or 0.0)
        if tx_type == "revenu":
            revenus_count += 1
            total_revenus += amount
        elif tx_type == "depense":
            depenses_count += 1
            total_depenses += amount

        uid_raw = tx.get("user_id")
        uid_key = str(uid_raw).strip() if uid_raw is not None else ""
        user_info = users_by_id.get(uid_key)
        resolved_name = user_info["name"] if (user_info and user_info["name"]) else None

        stat = per_user_stats[uid_key or "<MANQUANT>"]
        stat["user_id"] = uid_key or "<MANQUANT>"
        stat["user_code"] = user_info["Id"] if user_info else "INCONNU"
        stat["user_name"] = resolved_name
        stat["total"] += 1

        if _has_valid_nom_utilisateur(tx):
            already_migrated += 1
            stat["already_migrated"] += 1
            existing_name = str(tx["nom_utilisateur"]).strip()
            if resolved_name and existing_name != resolved_name:
                name_mismatches_existing.append(
                    {
                        "tx_id": str(tx["_id"]),
                        "existing": existing_name,
                        "current_user_name": resolved_name,
                    }
                )
            continue

        if not resolved_name:
            stat["orphan"] = True
            orphan_transactions.append(
                {
                    "tx_id": str(tx["_id"]),
                    "user_id": uid_key or "<MANQUANT>",
                    "reason": "Utilisateur introuvable dans utilisateurs"
                    if user_info is None
                    else "Champ name vide dans utilisateurs",
                }
            )
            continue

        to_migrate_count += 1
        stat["to_migrate"] += 1
        if not dry_run:
            ids_by_resolved_name[resolved_name].append(tx["_id"])

    matched_count = 0
    modified_count = 0
    if not dry_run and ids_by_resolved_name:
        for resolved_name, tx_ids in ids_by_resolved_name.items():
            for i in range(0, len(tx_ids), 500):
                chunk = tx_ids[i : i + 500]
                res = transactions.update_many(
                    {"_id": {"$in": chunk}, **missing_filter},
                    {"$set": {"nom_utilisateur": resolved_name}},
                )
                matched_count += res.matched_count
                modified_count += res.modified_count

    total_after = transactions.count_documents({})
    missing_after = transactions.count_documents(missing_filter)
    with_field_after = transactions.count_documents(
        {"nom_utilisateur": {"$exists": True, "$nin": [None, ""]}}
    )

    return {
        "database": db.name,
        "collection": COLLECTION_TRANSACTIONS,
        "dry_run": dry_run,
        "users_count": len(users_by_id),
        "total_before": total_before,
        "already_migrated_before": already_migrated,
        "to_migrate": to_migrate_count,
        "orphan_count": len(orphan_transactions),
        "orphan_transactions": orphan_transactions[:20],
        "existing_name_mismatches_count": len(name_mismatches_existing),
        "matched_count": matched_count,
        "modified_count": modified_count,
        "total_after": total_after,
        "with_field_after": with_field_after,
        "missing_after": missing_after,
        "revenus_count": revenus_count,
        "depenses_count": depenses_count,
        "total_revenus": round(total_revenus, 2),
        "total_depenses": round(total_depenses, 2),
        "per_user_breakdown": sorted(per_user_stats.values(), key=lambda x: x["total"], reverse=True),
    }


def migrate_transactions(db: Database, dry_run: bool = False) -> Dict[str, Any]:
    """Alias principal compatible avec les appels existants et tests."""
    return inspect_and_migrate_transactions(db=db, dry_run=dry_run)


def _print_report(report: Dict[str, Any], cluster_host: str, is_atlas: bool) -> None:
    print(f"target_type: {'MongoDB Atlas' if is_atlas else 'MongoDB Local'}")
    print(f"cluster_host: {cluster_host}")
    print(f"database: {report['database']}")
    print(f"collection: {report['collection']}")
    print(f"dry_run: {report['dry_run']}")
    print(f"users_count: {report['users_count']}")
    print(f"total_before: {report['total_before']}")
    print(f"already_migrated_before: {report['already_migrated_before']}")
    print(f"to_migrate: {report['to_migrate']}")
    print(f"orphan_count: {report['orphan_count']}")
    print(f"existing_name_mismatches_count: {report['existing_name_mismatches_count']}")
    print(f"matched_count: {report['matched_count']}")
    print(f"modified_count: {report['modified_count']}")
    print(f"total_after: {report['total_after']}")
    print(f"with_field_after: {report['with_field_after']}")
    print(f"missing_after: {report['missing_after']}")
    print(f"revenus_count: {report['revenus_count']} (total: {report['total_revenus']})")
    print(f"depenses_count: {report['depenses_count']} (total: {report['total_depenses']})")
    print("--- Répartition par user_id ---")
    for row in report["per_user_breakdown"]:
        print(
            f"  user_id={row['user_id']} | Id={row['user_code']} | nom={row['user_name'] or '<INTROUVABLE>'} | "
            f"total={row['total']} | déjà_migrées={row['already_migrated']} | à_migrer={row['to_migrate']} | orphelin={row['orphan']}"
        )
    if report["orphan_transactions"]:
        print("--- Transactions sans utilisateur correspondant (non modifiées) ---")
        for item in report["orphan_transactions"]:
            print(f"  tx_id={item['tx_id']} | user_id={item['user_id']} | {item['reason']}")


def main() -> None:
    # Ne charge .env que si MONGO_URI n'est pas déjà injecté dans l'environnement
    if not (os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")):
        load_dotenv(BACKEND_DIR / ".env")

    parser = argparse.ArgumentParser(
        description="Migration idempotente nom_utilisateur sur transactions via correspondance user_id -> utilisateurs."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simule la migration sans modifier MongoDB.",
    )
    parser.add_argument(
        "--atlas",
        action="store_true",
        help="Exige une connexion MongoDB Atlas (refuse localhost/127.0.0.1).",
    )
    parser.add_argument(
        "--prompt",
        action="store_true",
        help="Demande les identifiants MongoDB Atlas de façon masquée si MONGO_URI est absent.",
    )
    args = parser.parse_args()

    if args.atlas:
        mongo_uri, db_name = resolve_atlas_connection(prompt_if_missing=args.prompt)
        client = connect_atlas_verified(mongo_uri, db_name)
    else:
        mongo_uri = get_mongo_uri()
        db_name = os.getenv("MONGO_DATABASE") or os.getenv("MONGODB_DATABASE") or "choaib"
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")

    try:
        db = client[db_name]
        report = inspect_and_migrate_transactions(db, dry_run=args.dry_run)
        _print_report(
            report,
            cluster_host=extract_cluster_host(mongo_uri),
            is_atlas=is_atlas_uri(mongo_uri),
        )
        if args.atlas:
            print(f"masked_uri: {mask_mongo_uri(mongo_uri)}")
    finally:
        client.close()


if __name__ == "__main__":
    main()
