"""Service de génération des rapports statistiques et exports CSV/PDF."""

import csv
import io
from collections import defaultdict
from datetime import date, datetime, time, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from pymongo import ASCENDING
from pymongo.database import Database
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.exceptions import BadRequestException
from app.database.mongo import COLLECTION_CATEGORIES, COLLECTION_TRANSACTIONS
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.dashboard import (
    BalanceEvolutionItem,
    CategoryBreakdownItem,
    MonthlyEvolutionItem,
)
from app.schemas.report import ReportSummaryResponse
from app.services.dashboard_service import FALLBACK_COLORS, FRENCH_MONTHS
from app.utils.formatters import format_mad
from app.utils.object_id import user_id_match


def _bounds(date_from: Optional[date], date_to: Optional[date]) -> tuple[Optional[datetime], Optional[datetime]]:
    if date_from and date_to and date_from > date_to:
        raise BadRequestException("La date de début doit précéder la date de fin.")
    dt_from = datetime.combine(date_from, time.min, tzinfo=timezone.utc) if date_from else None
    dt_to = datetime.combine(date_to, time.max, tzinfo=timezone.utc) if date_to else None
    return dt_from, dt_to


class ReportService:
    def __init__(self, db: Database):
        self.db = db
        self.tx_repo = TransactionRepository(db)
        self.tx_collection = db[COLLECTION_TRANSACTIONS]
        self.cat_collection = db[COLLECTION_CATEGORIES]

    def get_summary(
        self,
        user_oid: ObjectId,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> ReportSummaryResponse:
        dt_from, dt_to = _bounds(date_from, date_to)
        query = self.tx_repo.build_filter_query(user_oid=user_oid, date_from=dt_from, date_to=dt_to)
        txs = list(self.tx_collection.find(query).sort([("date", ASCENDING)]))

        cat_colors: Dict[str, str] = {
            cat["nom"]: cat.get("couleur", "#64748B")
            for cat in self.cat_collection.find({"user_id": user_id_match(user_oid)})
        }

        total_revenus = 0.0
        total_depenses = 0.0
        expense_by_cat: Dict[str, float] = defaultdict(float)
        monthly_map: Dict[tuple[int, int], Dict[str, float]] = defaultdict(
            lambda: {"revenus": 0.0, "depenses": 0.0}
        )
        daily_map: Dict[str, Dict[str, float]] = defaultdict(lambda: {"revenus": 0.0, "depenses": 0.0})

        for tx in txs:
            amount = float(tx.get("montant", 0.0))
            tx_type = tx.get("type")
            tx_date: datetime = tx["date"]
            cat_name = tx.get("categorie", "Autres")
            m_key = (tx_date.year, tx_date.month)
            d_key = tx_date.strftime("%Y-%m-%d")

            if tx_type == "revenu":
                total_revenus += amount
                monthly_map[m_key]["revenus"] += amount
                daily_map[d_key]["revenus"] += amount
            elif tx_type == "depense":
                total_depenses += amount
                expense_by_cat[cat_name] += amount
                monthly_map[m_key]["depenses"] += amount
                daily_map[d_key]["depenses"] += amount

        total_revenus = round(total_revenus, 2)
        total_depenses = round(total_depenses, 2)
        epargne_nette = round(total_revenus - total_depenses, 2)
        taux_epargne = round((epargne_nette / total_revenus) * 100, 1) if total_revenus > 0 else 0.0

        depenses_par_categorie: List[CategoryBreakdownItem] = []
        for idx, (cat_name, amount) in enumerate(sorted(expense_by_cat.items(), key=lambda x: x[1], reverse=True)):
            val = round(amount, 2)
            pct = round((val / total_depenses) * 100, 1) if total_depenses > 0 else 0.0
            depenses_par_categorie.append(
                CategoryBreakdownItem(
                    categorie=cat_name,
                    montant=val,
                    couleur=cat_colors.get(cat_name, FALLBACK_COLORS[idx % len(FALLBACK_COLORS)]),
                    pourcentage=pct,
                )
            )

        comparaison_mensuelle: List[MonthlyEvolutionItem] = []
        for yr, mo in sorted(monthly_map.keys()):
            rev = round(monthly_map[(yr, mo)]["revenus"], 2)
            dep = round(monthly_map[(yr, mo)]["depenses"], 2)
            comparaison_mensuelle.append(
                MonthlyEvolutionItem(
                    periode=f"{yr}-{mo:02d}",
                    mois_label=f"{FRENCH_MONTHS.get(mo, str(mo))} {yr}",
                    annee=yr,
                    mois=mo,
                    revenus=rev,
                    depenses=dep,
                    epargne=round(rev - dep, 2),
                )
            )

        evolution_solde: List[BalanceEvolutionItem] = []
        running_balance = 0.0
        for d_key in sorted(daily_map.keys()):
            rev = round(daily_map[d_key]["revenus"], 2)
            dep = round(daily_map[d_key]["depenses"], 2)
            running_balance = round(running_balance + rev - dep, 2)
            evolution_solde.append(
                BalanceEvolutionItem(
                    date=d_key,
                    solde=running_balance,
                    revenus=rev,
                    depenses=dep,
                )
            )

        return ReportSummaryResponse(
            total_revenus=total_revenus,
            total_depenses=total_depenses,
            epargne_nette=epargne_nette,
            taux_epargne=taux_epargne,
            nombre_transactions=len(txs),
            depenses_par_categorie=depenses_par_categorie,
            comparaison_mensuelle=comparaison_mensuelle,
            evolution_solde=evolution_solde,
        )

    def export_csv(
        self,
        user_oid: ObjectId,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        tx_type: Optional[str] = None,
        categorie: Optional[str] = None,
    ) -> bytes:
        dt_from, dt_to = _bounds(date_from, date_to)
        docs = self.tx_repo.list_all_for_export(
            user_oid=user_oid,
            date_from=dt_from,
            date_to=dt_to,
            tx_type=tx_type,
            categorie=categorie,
        )

        buffer = io.StringIO()
        writer = csv.writer(buffer, delimiter=",")
        writer.writerow(["Date", "Type", "Catégorie", "Montant (MAD)", "Description"])
        for doc in docs:
            writer.writerow(
                [
                    doc["date"].strftime("%Y-%m-%d"),
                    doc["type"],
                    doc["categorie"],
                    f"{float(doc['montant']):.2f}",
                    doc.get("description", ""),
                ]
            )
        return ("\ufeff" + buffer.getvalue()).encode("utf-8")

    def export_pdf(
        self,
        current_user: Dict[str, Any],
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> bytes:
        user_oid: ObjectId = current_user["_id"]
        summary = self.get_summary(user_oid, date_from=date_from, date_to=date_to)
        dt_from, dt_to = _bounds(date_from, date_to)
        docs = self.tx_repo.list_all_for_export(user_oid=user_oid, date_from=dt_from, date_to=dt_to)

        buffer = io.BytesIO()
        pdf = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=1.5 * cm, rightMargin=1.5 * cm, topMargin=1.5 * cm)
        styles = getSampleStyleSheet()
        elements = []

        elements.append(Paragraph("<b>Finora — Rapport Financier Personnel</b>", styles["Title"]))
        periode_str = (
            f"Période : {date_from or 'Début'} au {date_to or 'Aujourd hui'}"
            if (date_from or date_to)
            else "Période : Toutes les transactions"
        )
        elements.append(
            Paragraph(
                f"Utilisateur : {current_user.get('name', '')} ({current_user.get('Id', '')}) | {periode_str}",
                styles["Normal"],
            )
        )
        elements.append(Spacer(1, 14))

        kpi_data = [
            ["Total Revenus", "Total Dépenses", "Épargne Nette", "Transactions"],
            [
                format_mad(summary.total_revenus),
                format_mad(summary.total_depenses),
                format_mad(summary.epargne_nette),
                str(summary.nombre_transactions),
            ],
        ]
        kpi_table = Table(kpi_data, colWidths=[4.4 * cm, 4.4 * cm, 4.4 * cm, 3.6 * cm])
        kpi_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ("PADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        elements.append(kpi_table)
        elements.append(Spacer(1, 16))

        if summary.depenses_par_categorie:
            elements.append(Paragraph("<b>Dépenses par catégorie</b>", styles["Heading2"]))
            cat_rows = [["Catégorie", "Montant", "Part (%)"]] + [
                [item.categorie, format_mad(item.montant), f"{item.pourcentage:.1f} %"]
                for item in summary.depenses_par_categorie
            ]
            cat_table = Table(cat_rows, colWidths=[8 * cm, 5 * cm, 3.8 * cm])
            cat_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                        ("PADDING", (0, 0), (-1, -1), 6),
                    ]
                )
            )
            elements.append(cat_table)
            elements.append(Spacer(1, 16))

        elements.append(Paragraph("<b>Détail des transactions</b>", styles["Heading2"]))
        tx_rows = [["Date", "Type", "Catégorie", "Montant", "Description"]]
        for doc in docs[:100]:
            tx_rows.append(
                [
                    doc["date"].strftime("%Y-%m-%d"),
                    "Revenu" if doc["type"] == "revenu" else "Dépense",
                    doc["categorie"][:24],
                    format_mad(float(doc["montant"])),
                    (doc.get("description", "") or "-")[:34],
                ]
            )
        if len(tx_rows) == 1:
            tx_rows.append(["-", "-", "Aucune transaction", "-", "-"])

        tx_table = Table(tx_rows, colWidths=[2.5 * cm, 2.2 * cm, 3.8 * cm, 3.3 * cm, 5.0 * cm])
        tx_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        elements.append(tx_table)

        pdf.build(elements)
        return buffer.getvalue()
