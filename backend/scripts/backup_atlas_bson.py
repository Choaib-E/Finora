"""
Sauvegarde BSON complète (préservant ObjectId, ISODate et tous types BSON) depuis MongoDB Atlas.

Stocke les sauvegardes dans `backend/backups/atlas_<timestamp>/` (exclu de Git via `.gitignore`).
Vérifie l'intégrité des fichiers BSON écrits par relecture (`bson.decode_all`).

Utilisation :
    cd backend
    .\\.venv\\Scripts\\python.exe -m scripts.backup_atlas_bson --prompt
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

import bson

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database.mongo import EXPECTED_COLLECTIONS  # noqa: E402
from scripts.atlas_utils import (  # noqa: E402
    connect_atlas_verified,
    extract_cluster_host,
    mask_mongo_uri,
    resolve_atlas_connection,
)


def backup_collections_bson(db, output_dir: Path) -> Dict[str, Dict[str, int]]:
    """Sauvegarde chaque collection de `choaib` en format binaire BSON natif et vérifie la relecture."""
    output_dir.mkdir(parents=True, exist_ok=True)
    summary: Dict[str, Dict[str, int]] = {}

    for col_name in EXPECTED_COLLECTIONS:
        docs = list(db[col_name].find({}))
        bson_path = output_dir / f"{col_name}.bson"

        raw_chunks = [bson.encode(doc) for doc in docs]
        raw_bytes = b"".join(raw_chunks)
        bson_path.write_bytes(raw_bytes)

        # Vérification immédiate que le fichier BSON est lisible et complet
        decoded_docs = bson.decode_all(bson_path.read_bytes()) if raw_bytes else []
        if len(decoded_docs) != len(docs):
            raise RuntimeError(
                f"Échec de vérification de la sauvegarde pour {col_name} : "
                f"{len(decoded_docs)} relus != {len(docs)} lus."
            )

        summary[col_name] = {
            "documents_count": len(docs),
            "verified_bson_count": len(decoded_docs),
            "bytes": len(raw_bytes),
        }

    metadata = {
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "database": db.name,
        "collections": summary,
    }
    (output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Sauvegarde BSON complète des collections Atlas de choaib.")
    parser.add_argument(
        "--prompt",
        action="store_true",
        help="Demande les identifiants MongoDB Atlas de façon masquée si MONGO_URI est absent.",
    )
    args = parser.parse_args()

    mongo_uri, db_name = resolve_atlas_connection(prompt_if_missing=args.prompt)
    client = connect_atlas_verified(mongo_uri, db_name)
    try:
        db = client[db_name]
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_dir = BACKEND_DIR / "backups" / f"atlas_{db_name}_{stamp}"
        summary = backup_collections_bson(db, backup_dir)
        print(f"cluster_host: {extract_cluster_host(mongo_uri)}")
        print(f"masked_uri: {mask_mongo_uri(mongo_uri)}")
        print(f"database: {db.name}")
        print(f"backup_dir: {backup_dir}")
        for col_name, info in summary.items():
            print(
                f"  {col_name}: {info['documents_count']} docs | "
                f"vérifiés={info['verified_bson_count']} | {info['bytes']} octets"
            )
    finally:
        client.close()


if __name__ == "__main__":
    main()
