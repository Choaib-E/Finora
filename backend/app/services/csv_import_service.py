"""Service d'importation CSV avec correspondance Id -> utilisateurs._id, détection de doublons et sécurité."""

import csv
import io
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Set, Tuple
from bson import ObjectId
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import BadRequestException
from app.repositories.category_repository import CategoryRepository
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.csv_import import (
    CsvImportErrorItem,
    CsvImportResponse,
    CsvImportUserSummary,
)

REQUIRED_COLUMNS = {"Id", "date", "montant", "categorie", "type", "description"}
AUTO_COLORS = ["#3B82F6", "#F97316", "#10B981", "#8B5CF6", "#EC4899", "#06B6D4", "#EAB308"]


def _parse_csv_date(raw_date: str) -> datetime:
    cleaned = raw_date.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            dt = datetime.strptime(cleaned, fmt)
            return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)
        except ValueError:
            continue
    raise ValueError(f"Format de date invalide ('{raw_date}'). Format attendu : YYYY-MM-DD.")


def _decode_csv_bytes(raw_bytes: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return raw_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise BadRequestException("Impossible de décoder le fichier CSV (encodage UTF-8 recommandé).")


class CsvImportService:
    def __init__(self, db: Database):
        self.db = db
        self.user_repo = UserRepository(db)
        self.tx_repo = TransactionRepository(db)
        self.cat_repo = CategoryRepository(db)

    def import_csv(self, current_user: Dict[str, Any], raw_bytes: bytes) -> CsvImportResponse:
        if not raw_bytes:
            raise BadRequestException("Le fichier CSV est vide.")

        text = _decode_csv_bytes(raw_bytes)
        lines = [line for line in text.splitlines() if line.strip()]
        if not lines:
            raise BadRequestException("Le fichier CSV ne contient aucune ligne.")

        # Détecter le délimiteur (virgule ou point-virgule)
        header_line = lines[0]
        delimiter = ";" if header_line.count(";") > header_line.count(",") else ","
        reader = csv.DictReader(io.StringIO("\n".join(lines)), delimiter=delimiter)

        if not reader.fieldnames:
            raise BadRequestException("En-tête CSV introuvable.")

        normalized_fields = {col.strip() for col in reader.fieldnames if col}
        missing = REQUIRED_COLUMNS - normalized_fields
        if missing:
            raise BadRequestException(
                f"Colonnes obligatoires manquantes : {', '.join(sorted(missing))}. "
                "Format attendu : Id,date,montant,categorie,type,description"
            )

        is_admin = current_user.get("role", "user") == "admin"
        current_user_code = str(current_user.get("Id", "")).strip().upper()

        user_cache: Dict[str, Optional[Dict[str, Any]]] = {}
        seen_in_batch: Set[Tuple[str, str, float, str, str, str]] = set()
        imported_by_user: Dict[str, int] = defaultdict(int)
        errors: List[CsvImportErrorItem] = []

        total_rows = 0
        imported_count = 0
        duplicates_skipped = 0

        for row_idx, raw_row in enumerate(reader, start=2):
            total_rows += 1
            row = {(k.strip() if k else ""): (v.strip() if v else "") for k, v in raw_row.items()}
            raw_summary = f"{row.get('Id', '')},{row.get('date', '')},{row.get('montant', '')},{row.get('categorie', '')},{row.get('type', '')},{row.get('description', '')}"

            user_code = row.get("Id", "").upper()
            if not user_code:
                errors.append(
                    CsvImportErrorItem(
                        row_number=row_idx,
                        raw_data=raw_summary,
                        error="Le champ Id est vide.",
                    )
                )
                continue

            # Contrôle de sécurité : un utilisateur standard ne peut pas importer pour un autre utilisateur
            if not is_admin and user_code != current_user_code:
                errors.append(
                    CsvImportErrorItem(
                        row_number=row_idx,
                        raw_data=raw_summary,
                        error=(
                            f"Accès refusé : vous ne pouvez pas importer des transactions pour '{user_code}' "
                            f"(seul un administrateur peut importer pour d'autres utilisateurs)."
                        ),
                    )
                )
                continue

            if user_code not in user_cache:
                user_cache[user_code] = self.user_repo.find_by_business_id(user_code)

            target_user = user_cache[user_code]
            if target_user is None:
                errors.append(
                    CsvImportErrorItem(
                        row_number=row_idx,
                        raw_data=raw_summary,
                        error=f"Aucun utilisateur enregistré avec l'identifiant métier Id='{user_code}'.",
                    )
                )
                continue

            # Validation date
            try:
                tx_date = _parse_csv_date(row.get("date", ""))
            except ValueError as exc:
                errors.append(CsvImportErrorItem(row_number=row_idx, raw_data=raw_summary, error=str(exc)))
                continue

            # Validation montant
            raw_amount = row.get("montant", "").replace(",", ".")
            try:
                montant = round(float(raw_amount), 2)
                if montant <= 0:
                    raise ValueError("Le montant doit être positif.")
            except ValueError:
                errors.append(
                    CsvImportErrorItem(
                        row_number=row_idx,
                        raw_data=raw_summary,
                        error=f"Montant invalide ('{row.get('montant', '')}').",
                    )
                )
                continue

            # Validation catégorie et type
            categorie = row.get("categorie", "")
            if not categorie:
                errors.append(
                    CsvImportErrorItem(
                        row_number=row_idx,
                        raw_data=raw_summary,
                        error="La catégorie est obligatoire.",
                    )
                )
                continue

            tx_type = row.get("type", "").lower()
            if tx_type not in ("revenu", "depense"):
                errors.append(
                    CsvImportErrorItem(
                        row_number=row_idx,
                        raw_data=raw_summary,
                        error=f"Type invalide ('{row.get('type', '')}'). Valeurs acceptées : revenu, depense.",
                    )
                )
                continue

            description = row.get("description", "")
            target_oid: ObjectId = target_user["_id"]

            # Détection de doublon dans le lot ou en base
            batch_key = (
                str(target_oid),
                tx_date.strftime("%Y-%m-%d"),
                montant,
                categorie,
                tx_type,
                description,
            )
            if batch_key in seen_in_batch or self.tx_repo.exists_duplicate(
                user_oid=target_oid,
                tx_date=tx_date,
                montant=montant,
                categorie=categorie,
                tx_type=tx_type,
                description=description,
            ):
                duplicates_skipped += 1
                continue

            seen_in_batch.add(batch_key)

            # S'assurer que la catégorie existe pour l'utilisateur dans la collection categories
            if self.cat_repo.find_by_name_type_and_user(target_oid, categorie, tx_type) is None:
                try:
                    color = AUTO_COLORS[abs(hash(categorie)) % len(AUTO_COLORS)]
                    self.cat_repo.create(target_oid, categorie, tx_type, color)
                except DuplicateKeyError:
                    pass

            # Insertion dans l'unique collection transactions avec user_id = _id MongoDB réel
            self.tx_repo.create(
                user_oid=target_oid,
                tx_date=tx_date,
                montant=montant,
                categorie=categorie,
                tx_type=tx_type,
                description=description,
            )
            imported_count += 1
            imported_by_user[user_code] += 1

        return CsvImportResponse(
            total_rows=total_rows,
            imported_count=imported_count,
            duplicates_skipped=duplicates_skipped,
            error_count=len(errors),
            errors=errors,
            summary_by_user=[
                CsvImportUserSummary(user_code=code, imported_count=cnt)
                for code, cnt in sorted(imported_by_user.items())
            ],
        )
