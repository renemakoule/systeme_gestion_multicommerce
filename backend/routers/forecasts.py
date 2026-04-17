from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from datetime import datetime, timedelta
from typing import Optional, List
from database.db import get_session
from database.models import Sale, Expense, InventoryLog, Product
from services.time_utils import get_company_offset, to_local, to_utc

router = APIRouter(prefix="/previsions", tags=["forecasts"])

# ─────────────────────────────────────────────────────────────────────────────
# UTILITAIRE : Calcul des bornes d'une période historique
# ─────────────────────────────────────────────────────────────────────────────

def _get_period_bounds(session: Session, company_id: int, granularity: str, offset: int):
    """
    Retourne (start_utc, end_utc) pour `granularity` + `offset` périodes en arrière.
    """
    offset_hours = get_company_offset(session, company_id)
    now_utc = datetime.utcnow()
    now_local = to_local(now_utc, offset_hours)

    if granularity == "weekly":
        start_curr = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        start_curr -= timedelta(days=now_local.weekday())
        start_local = start_curr - timedelta(weeks=offset)
        end_local   = start_local + timedelta(weeks=1)

    elif granularity == "monthly":
        year  = now_local.year
        month = now_local.month - offset
        while month <= 0:
            month += 12
            year  -= 1
        start_local = now_local.replace(year=year, month=month, day=1,
                                        hour=0, minute=0, second=0, microsecond=0)
        nm = start_local.month + 1
        ny = start_local.year
        if nm > 12:
            nm = 1
            ny += 1
        end_local = start_local.replace(year=ny, month=nm, day=1)

    elif granularity == "yearly":
        start_local = now_local.replace(year=now_local.year - offset,
                                        month=1, day=1, hour=0, minute=0,
                                        second=0, microsecond=0)
        end_local = start_local.replace(year=start_local.year + 1)
    else:
        return None, None

    return to_utc(start_local, offset_hours), to_utc(end_local, offset_hours)


def _period_label(session: Session, company_id: int, granularity: str, offset: int, future: bool = False) -> str:
    """Génère un label lisible pour la période."""
    offset_hours = get_company_offset(session, company_id)
    now_utc = datetime.utcnow()
    now_local = to_local(now_utc, offset_hours)

    MONTHS_FR = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                 "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

    if granularity == "weekly":
        start_curr = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        start_curr -= timedelta(days=now_local.weekday())
        if future:
            ref_start = start_curr + timedelta(weeks=offset)
        else:
            ref_start = start_curr - timedelta(weeks=offset)
        week_num = ref_start.isocalendar()[1]
        return f"Semaine {week_num} ({ref_start.strftime('%d/%m')})"

    elif granularity == "monthly":
        if future:
            month = now_local.month + offset
            year  = now_local.year
            while month > 12:
                month -= 12
                year  += 1
        else:
            month = now_local.month - offset
            year  = now_local.year
            while month <= 0:
                month += 12
                year  -= 1
        return f"{MONTHS_FR[month]} {year}"

    elif granularity == "yearly":
        if future:
            return str(now_local.year + offset)
        else:
            return str(now_local.year - offset)

    return ""


# ─────────────────────────────────────────────────────────────────────────────
# ALGORITHME WMA — Moyenne Mobile Pondérée
# ─────────────────────────────────────────────────────────────────────────────

def _weighted_moving_average(values: List[float]) -> float:
    """WMA : les valeurs les plus récentes (fin de liste) ont le plus de poids."""
    n = len(values)
    if n == 0: return 0.0
    weights = list(range(1, n + 1))
    total_weight = sum(weights)
    return sum(w * v for w, v in zip(weights, values)) / total_weight


def _std_dev(values: List[float], mean: float) -> float:
    """Écart-type simple."""
    if len(values) < 2: return mean * 0.15 
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return variance ** 0.5


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/data")
def get_sales_forecast(
    company_id: int,
    granularity: str = "monthly",
    history_periods: int = 12,
    future_periods: int = 3,
    user_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    historical = []
    for offset in range(history_periods - 1, -1, -1):
        start_utc, end_utc = _get_period_bounds(session, company_id, granularity, offset)
        if start_utc is None: continue

        stmt = select(Sale).where(Sale.company_id == company_id, Sale.timestamp >= start_utc, Sale.timestamp < end_utc)
        if user_id: stmt = stmt.where(Sale.user_id == user_id)

        sales = session.exec(stmt).all()
        completed  = [s for s in sales if s.status == "completed"]
        cancelled  = [s for s in sales if s.status == "cancelled"]
        ca = sum(s.total_amount for s in completed) - sum(s.total_amount for s in cancelled)

        historical.append({
            "label":     _period_label(session, company_id, granularity, offset),
            "offset":    offset,
            "ca":        max(0.0, ca),
            "nb_ventes": len(completed),
        })

    ca_values = [p["ca"] for p in historical]
    forecasts = []
    for fp in range(1, future_periods + 1):
        all_values = ca_values + [f["projected_ca"] for f in forecasts]
        projected = _weighted_moving_average(all_values)
        std = _std_dev(ca_values, projected)
        forecasts.append({
            "label":        _period_label(session, company_id, granularity, fp, future=True),
            "projected_ca": round(projected, 0),
            "min":          round(max(0, projected - std), 0),
            "max":          round(projected + std, 0),
        })

    if ca_values and sum(ca_values) > 0:
        mean_ca = sum(ca_values) / len(ca_values)
        std_ca  = _std_dev(ca_values, mean_ca)
        cv      = std_ca / mean_ca if mean_ca > 0 else 1.0
        reliability = round(max(0, min(100, (1 - min(cv, 1)) * 100)))
    else: reliability = 0

    return {
        "granularity": granularity, "historical": historical, "forecasts": forecasts,
        "reliability": reliability, "periods_analyzed": sum(1 for p in historical if p["ca"] > 0),
        "algorithm": "WMA (Moyenne Mobile Pondérée)",
    }

@router.get("/finances")
def get_finance_forecast(
    company_id: int,
    granularity: str = "monthly",
    history_periods: int = 12,
    future_periods: int = 3,
    session: Session = Depends(get_session)
):
    historical = []
    for offset in range(history_periods - 1, -1, -1):
        start_utc, end_utc = _get_period_bounds(session, company_id, granularity, offset)
        if start_utc is None: continue
        sales = session.exec(select(Sale).where(Sale.company_id == company_id, Sale.timestamp >= start_utc, Sale.timestamp < end_utc)).all()
        income = sum(s.total_amount for s in sales if s.status == "completed") - sum(s.total_amount for s in sales if s.status == "cancelled")
        expenses = session.exec(select(Expense).where(Expense.company_id == company_id, Expense.date >= start_utc, Expense.date < end_utc)).all()
        outgo = sum(e.amount for e in expenses)

        historical.append({
            "label":    _period_label(session, company_id, granularity, offset),
            "income":   float(income), "expenses": float(outgo), "profit":   float(income - outgo)
        })

    profit_values = [p["profit"] for p in historical]
    forecasts = []
    for fp in range(1, future_periods + 1):
        all_values = profit_values + [f["projected_profit"] for f in forecasts]
        projected = _weighted_moving_average(all_values)
        std = _std_dev(profit_values, projected)
        forecasts.append({
            "label":            _period_label(session, company_id, granularity, fp, future=True),
            "projected_profit": round(projected, 0),
            "min":              round(projected - std, 0),
            "max":              round(projected + std, 0),
        })

    return {"granularity": granularity, "historical": historical, "forecasts": forecasts, "algorithm": "WMA (Profit Net)"}

@router.get("/inventory")
def get_inventory_forecast(
    company_id: int,
    granularity: str = "monthly",
    history_periods: int = 12,
    future_periods: int = 3,
    session: Session = Depends(get_session)
):
    historical = []
    for offset in range(history_periods - 1, -1, -1):
        start_utc, end_utc = _get_period_bounds(session, company_id, granularity, offset)
        if start_utc is None: continue
        logs = session.exec(select(InventoryLog).join(Product, InventoryLog.product_id == Product.id).where(Product.company_id == company_id, InventoryLog.type == "OUT", InventoryLog.timestamp >= start_utc, InventoryLog.timestamp < end_utc)).all()
        consumption = sum(abs(l.change_qty) for l in logs)
        historical.append({"label": _period_label(session, company_id, granularity, offset), "consumption": float(consumption)})

    cons_values = [h["consumption"] for h in historical]
    forecasts = []
    for fp in range(1, future_periods + 1):
        all_values = cons_values + [f["projected_consumption"] for f in forecasts]
        projected = _weighted_moving_average(all_values)
        std = _std_dev(cons_values, projected)
        forecasts.append({
            "label":                 _period_label(session, company_id, granularity, fp, future=True),
            "projected_consumption": round(projected, 0),
            "min":                   round(max(0, projected - std), 0),
            "max":                   round(projected + std, 0),
        })

    return {"granularity": granularity, "historical": historical, "forecasts": forecasts, "algorithm": "WMA (Consommation)"}
