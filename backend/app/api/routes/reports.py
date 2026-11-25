"""Routes API pour les rapports financiers et les exports CSV/PDF."""

from datetime import date
from typing import Any, Dict, Literal, Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from pymongo.database import Database

from app.api.deps import get_current_user
from app.database.mongo import get_db
from app.schemas.report import ReportSummaryResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Rapports et Exports"])


@router.get("/summary", response_model=ReportSummaryResponse, summary="Statistiques de rapports financiers")
def get_report_summary(
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> ReportSummaryResponse:
    return ReportService(db).get_summary(current_user["_id"], date_from=date_from, date_to=date_to)


@router.get("/export/csv", summary="Exporter les transactions de l'utilisateur en CSV")
def export_csv(
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    type: Optional[Literal["revenu", "depense"]] = Query(default=None),
    categorie: Optional[str] = Query(default=None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> Response:
    csv_bytes = ReportService(db).export_csv(
        user_oid=current_user["_id"],
        date_from=date_from,
        date_to=date_to,
        tx_type=type,
        categorie=categorie,
    )
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="finora_rapport.csv"'},
    )


@router.get("/export/pdf", summary="Exporter le rapport financier de l'utilisateur en PDF")
def export_pdf(
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> Response:
    pdf_bytes = ReportService(db).export_pdf(
        current_user=current_user,
        date_from=date_from,
        date_to=date_to,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="finora_rapport.pdf"'},
    )
