"""Route API du tableau de bord."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from app.api.deps import get_current_user
from app.database.mongo import get_db
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse, summary="Statistiques et graphiques du tableau de bord")
def get_dashboard(
    mois: Optional[int] = Query(default=None, ge=1, le=12),
    annee: Optional[int] = Query(default=None, ge=2000, le=2100),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> DashboardResponse:
    return DashboardService(db).get_dashboard(current_user["_id"], mois=mois, annee=annee)
