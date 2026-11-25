"""Service d'agrégation des statistiques réelles du tableau de bord."""

from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database

from app.database.mongo import COLLECTION_CATEGORIES, COLLECTION_TRANSACTIONS
from app.schemas.dashboard import (
    BalanceEvolutionItem,
    CategoryBreakdownItem,
    DashboardResponse,
    MonthlyEvolutionItem,
)
from app.services.budget_service import BudgetService
from app.services.transaction_service import serialize_transaction
from app.utils.object_id import user_id_match

FRENCH_MONTHS = {
    1: "Jan",
    2: "Fév",
    3: "Mar",
    4: "Avr",
    5: "Mai",
    6: "Jun",
    7: "Jul",
    8: "Aoû",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Déc",
}

FALLBACK_COLORS = [
    "#315CF5",
    "#059669",
    "#F59E0B",
    "#E5484D",
    "#8B5CF6",
    "#06B6D4",
    "#EC4899",
    "#6366F1",
    "#64748B",
]


def _pct_change(current: float, previous: float) -> Optional[float]:
    """Calcule la variation en pourcentage sans division par zéro."""
    if previous == 0:
        return 0.0 if current == 0 else None
    return round(((current - previous) / abs(previous)) * 100, 1)


def _build_category_breakdown(
    expense_by_cat: Dict[str, float],
    total_depenses: float,
    cat_colors: Dict[str, str],
) -> List[CategoryBreakdownItem]:
    items: List[CategoryBreakdownItem] = []
    sorted_cats = sorted(expense_by_cat.items(), key=lambda x: x[1], reverse=True)
    for idx, (cat_name, amount) in enumerate(sorted_cats):
        rounded_amt = round(amount, 2)
        pct = round((rounded_amt / total_depenses) * 100, 1) if total_depenses > 0 else 0.0
        color = cat_colors.get(cat_name, FALLBACK_COLORS[idx % len(FALLBACK_COLORS)])
        items.append(
            CategoryBreakdownItem(
                categorie=cat_name,
                montant=rounded_amt,
                couleur=color,
                pourcentage=pct,
            )
        )
    return items


class DashboardService:
    def __init__(self, db: Database):
        self.db = db
        self.tx_collection = db[COLLECTION_TRANSACTIONS]
        self.cat_collection = db[COLLECTION_CATEGORIES]

    def get_dashboard(
        self,
        user_oid: ObjectId,
        mois: Optional[int] = None,
        annee: Optional[int] = None,
    ) -> DashboardResponse:
        now = datetime.now(timezone.utc)
        target_month = mois or now.month
        target_year = annee or now.year

        prev_month = 12 if target_month == 1 else target_month - 1
        prev_year = target_year - 1 if target_month == 1 else target_year

        all_txs = list(
            self.tx_collection.find({"user_id": user_id_match(user_oid)}).sort(
                [("date", ASCENDING), ("created_at", ASCENDING)]
            )
        )

        cat_colors: Dict[str, str] = {}
        for cat in self.cat_collection.find({"user_id": user_id_match(user_oid)}):
            cat_colors[cat["nom"]] = cat.get("couleur", "#64748B")

        total_revenus = 0.0
        total_depenses = 0.0
        revenus_mois = 0.0
        depenses_mois = 0.0
        transactions_mois = 0

        revenus_prev_mois = 0.0
        depenses_prev_mois = 0.0

        balance_end_selected = 0.0
        balance_end_prev = 0.0

        expense_by_cat_global: Dict[str, float] = defaultdict(float)
        expense_by_cat_month: Dict[str, float] = defaultdict(float)
        monthly_map: Dict[tuple[int, int], Dict[str, float]] = defaultdict(
            lambda: {"revenus": 0.0, "depenses": 0.0}
        )
        daily_map: Dict[str, Dict[str, float]] = defaultdict(lambda: {"revenus": 0.0, "depenses": 0.0})

        for tx in all_txs:
            amount = float(tx.get("montant", 0.0))
            tx_type = tx.get("type")
            tx_date: datetime = tx["date"]
            cat_name = tx.get("categorie", "Autres")
            day_key = tx_date.strftime("%Y-%m-%d")
            month_key = (tx_date.year, tx_date.month)

            signed_delta = amount if tx_type == "revenu" else (-amount if tx_type == "depense" else 0.0)
            if (tx_date.year, tx_date.month) <= (target_year, target_month):
                balance_end_selected += signed_delta
            if (tx_date.year, tx_date.month) <= (prev_year, prev_month):
                balance_end_prev += signed_delta

            if tx_type == "revenu":
                total_revenus += amount
                monthly_map[month_key]["revenus"] += amount
                daily_map[day_key]["revenus"] += amount
                if month_key == (target_year, target_month):
                    revenus_mois += amount
                    transactions_mois += 1
                elif month_key == (prev_year, prev_month):
                    revenus_prev_mois += amount
            elif tx_type == "depense":
                total_depenses += amount
                expense_by_cat_global[cat_name] += amount
                monthly_map[month_key]["depenses"] += amount
                daily_map[day_key]["depenses"] += amount
                if month_key == (target_year, target_month):
                    depenses_mois += amount
                    expense_by_cat_month[cat_name] += amount
                    transactions_mois += 1
                elif month_key == (prev_year, prev_month):
                    depenses_prev_mois += amount

        total_revenus = round(total_revenus, 2)
        total_depenses = round(total_depenses, 2)
        solde_total = round(total_revenus - total_depenses, 2)
        epargne = solde_total
        taux_epargne = round((epargne / total_revenus) * 100, 1) if total_revenus > 0 else 0.0

        revenus_mois = round(revenus_mois, 2)
        depenses_mois = round(depenses_mois, 2)
        epargne_mois = round(revenus_mois - depenses_mois, 2)
        epargne_prev_mois = round(revenus_prev_mois - depenses_prev_mois, 2)

        depenses_par_categorie = _build_category_breakdown(expense_by_cat_global, total_depenses, cat_colors)
        depenses_par_categorie_mois = _build_category_breakdown(expense_by_cat_month, depenses_mois, cat_colors)

        evolution_mensuelle: List[MonthlyEvolutionItem] = []
        for yr, mo in sorted(monthly_map.keys()):
            rev = round(monthly_map[(yr, mo)]["revenus"], 2)
            dep = round(monthly_map[(yr, mo)]["depenses"], 2)
            evolution_mensuelle.append(
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
        for day_key in sorted(daily_map.keys()):
            rev = round(daily_map[day_key]["revenus"], 2)
            dep = round(daily_map[day_key]["depenses"], 2)
            running_balance = round(running_balance + rev - dep, 2)
            evolution_solde.append(
                BalanceEvolutionItem(
                    date=day_key,
                    solde=running_balance,
                    revenus=rev,
                    depenses=dep,
                )
            )

        recent_docs = list(
            self.tx_collection.find({"user_id": user_id_match(user_oid)})
            .sort([("date", DESCENDING), ("created_at", DESCENDING)])
            .limit(6)
        )
        transactions_recentes = [serialize_transaction(doc) for doc in recent_docs]

        budgets_mois = BudgetService(self.db).list_budgets(user_oid, mois=target_month, annee=target_year)
        budgets_alertes = [b for b in budgets_mois if b.alerte_niveau != "ok"]

        return DashboardResponse(
            solde_total=solde_total,
            total_revenus=total_revenus,
            total_depenses=total_depenses,
            epargne=epargne,
            taux_epargne=taux_epargne,
            nombre_transactions=len(all_txs),
            transactions_mois=transactions_mois,
            revenus_mois=revenus_mois,
            depenses_mois=depenses_mois,
            epargne_mois=epargne_mois,
            solde_evolution_pct=_pct_change(round(balance_end_selected, 2), round(balance_end_prev, 2)),
            revenus_evolution_pct=_pct_change(revenus_mois, round(revenus_prev_mois, 2)),
            depenses_evolution_pct=_pct_change(depenses_mois, round(depenses_prev_mois, 2)),
            epargne_evolution_pct=_pct_change(epargne_mois, epargne_prev_mois),
            mois_selectionne=target_month,
            annee_selectionnee=target_year,
            depenses_par_categorie=depenses_par_categorie,
            depenses_par_categorie_mois=depenses_par_categorie_mois,
            evolution_mensuelle=evolution_mensuelle,
            evolution_solde=evolution_solde,
            transactions_recentes=transactions_recentes,
            budgets_mois=budgets_mois,
            budgets_alertes=budgets_alertes,
            has_data=len(all_txs) > 0,
        )
