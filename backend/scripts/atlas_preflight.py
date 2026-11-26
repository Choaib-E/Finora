"""
Exécution groupée des Phases 2 à 5 (lecture seule + sauvegarde BSON + dry-run Atlas).

Saisie unique et masquée des identifiants en mémoire (ou lecture de $env:MONGO_URI),
sans jamais modifier .env, sans afficher de mot de passe et sans modifier Atlas.

Utilisation :
    cd backend
    .\\.venv\\Scripts\\python.exe -m scripts.atlas_preflight --prompt
"""

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from scripts.atlas_utils import (  # noqa: E402
    connect_atlas_verified,
    extract_cluster_host,
    is_atlas_uri,
    mask_mongo_uri,
    resolve_atlas_connection,
)
from scripts.backup_atlas_bson import backup_collections_bson  # noqa: E402
from scripts.migrate_transactions_nom_utilisateur import (  # noqa: E402
    _print_report,
    inspect_and_migrate_transactions,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Phases 2-5 : connexion Atlas, audit, sauvegarde BSON et dry-run.")
    parser.add_argument(
        "--prompt",
        action="store_true",
        help="Demande les identifiants MongoDB Atlas de façon masquée si MONGO_URI est absent.",
    )
    args = parser.parse_args()

    # Phase 2 : Connexion sécurisée à Atlas (aucun repli sur localhost)
    mongo_uri, db_name = resolve_atlas_connection(prompt_if_missing=args.prompt)
    client = connect_atlas_verified(mongo_uri, db_name)
    try:
        db = client[db_name]
        print("=== PHASE 2 : CONNEXION MONGODB ATLAS VERIFIEE ===")
        print(f"cluster_host: {extract_cluster_host(mongo_uri)}")
        print(f"masked_uri: {mask_mongo_uri(mongo_uri)}")
        print(f"database: {db.name}")
        print(f"collections_presentes: {sorted(db.list_collection_names())}")

        # Phase 4 : Sauvegarde BSON complète préalable (types ObjectId / BSON préservés, exclu de Git)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_dir = BACKEND_DIR / "backups" / f"atlas_{db_name}_{stamp}"
        summary = backup_collections_bson(db, backup_dir)
        print("\n=== PHASE 4 : SAUVEGARDE BSON COMPLETE ET VERIFIEE ===")
        print(f"backup_dir: {backup_dir}")
        for col_name, info in summary.items():
            print(
                f"  {col_name}: {info['documents_count']} docs | "
                f"vérifiés={info['verified_bson_count']} | {info['bytes']} octets"
            )

        # Phase 3 & 5 : Audit + Dry-Run (zéro écriture sur Atlas)
        print("\n=== PHASES 3 & 5 : AUDIT ATLAS + DRY-RUN ===")
        report = inspect_and_migrate_transactions(db, dry_run=True)
        _print_report(
            report,
            cluster_host=extract_cluster_host(mongo_uri),
            is_atlas=is_atlas_uri(mongo_uri),
        )
        print("\n[INFO] Aucune écriture effectuée sur Atlas (--dry-run). Attente de confirmation avant Phase 6.")
    finally:
        client.close()


if __name__ == "__main__":
    main()
