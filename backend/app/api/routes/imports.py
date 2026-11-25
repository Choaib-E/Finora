"""Route API pour l'importation de fichiers CSV de transactions."""

from typing import Any, Dict
from fastapi import APIRouter, Depends, File, UploadFile
from pymongo.database import Database

from app.api.deps import get_current_user
from app.core.exceptions import BadRequestException
from app.database.mongo import get_db
from app.schemas.csv_import import CsvImportResponse
from app.services.csv_import_service import CsvImportService

router = APIRouter(prefix="/imports", tags=["Importation CSV"])


@router.post("/csv", response_model=CsvImportResponse, summary="Importer des transactions depuis un fichier CSV")
async def import_csv_transactions(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> CsvImportResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise BadRequestException("Veuillez fournir un fichier au format .csv.")

    content = await file.read()
    return CsvImportService(db).import_csv(current_user, content)
