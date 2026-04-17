from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database.db import get_session
from database.models import Expense
from datetime import datetime, timedelta
from services.time_utils import get_company_offset, to_local, to_utc

# ─────────────────────────────────────────────────────────────────────────────
# UTILITAIRES : Bornes temporelles et Labels
# ─────────────────────────────────────────────────────────────────────────────
def get_period_bounds(session: Session, company_id: int, period: str, offset: int = 0):
    offset_hours = get_company_offset(session, company_id)
    now_utc = datetime.utcnow()
    now_local = to_local(now_utc, offset_hours)
    
    if period == "daily":
        current_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "weekly":
        current_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        current_start_local -= timedelta(days=now_local.weekday())
    elif period == "monthly":
        current_start_local = now_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "yearly":
        current_start_local = now_local.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        return None, None
        
    if period == "daily":
        start_local = current_start_local - timedelta(days=offset)
        end_local   = start_local + timedelta(days=1)
    elif period == "weekly":
        start_local = current_start_local - timedelta(weeks=offset)
        end_local   = start_local + timedelta(weeks=1)
    elif period == "monthly":
        year, month = current_start_local.year, current_start_local.month - offset
        while month <= 0: month += 12; year -= 1
        start_local = current_start_local.replace(year=year, month=month, day=1)
        nm, ny = start_local.month + 1, start_local.year
        if nm > 12: nm = 1; ny += 1
        end_local = start_local.replace(year=ny, month=nm, day=1)
    elif period == "yearly":
        start_local = current_start_local.replace(year=current_start_local.year - offset)
        end_local   = start_local.replace(year=start_local.year + 1)
        
    return to_utc(start_local, offset_hours), to_utc(end_local, offset_hours)

def period_label(session: Session, company_id: int, period: str, offset: int) -> str:
    offset_hours = get_company_offset(session, company_id)
    now_utc = datetime.utcnow()
    now_local = to_local(now_utc, offset_hours)
    
    MONTHS_FR = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    if period == "daily":
        return (now_local - timedelta(days=offset)).strftime("%d/%m")
    elif period == "weekly":
        start = now_local.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=now_local.weekday()) - timedelta(weeks=offset)
        return f"Sem {start.isocalendar()[1]}"
    elif period == "monthly":
        m, y = now_local.month - offset, now_local.year
        while m <= 0: m += 12; y -= 1
        return f"{MONTHS_FR[m][:3]}. {y}"
    elif period == "yearly":
        return str(now_local.year - offset)
    return ""

router = APIRouter(prefix="/expenses", tags=["expenses"])

@router.get("/", response_model=List[Expense])
def list_expenses(company_id: int, period: str = "daily", offset: int = 0, session: Session = Depends(get_session)):
    start_utc, end_utc = get_period_bounds(session, company_id, period, offset)
    query = select(Expense).where(Expense.company_id == company_id)
    if start_utc and end_utc:
        query = query.where(Expense.date >= start_utc, Expense.date < end_utc)
    return session.exec(query.order_by(Expense.date.desc())).all()

@router.get("/summary-by-period")
def get_expenses_summary(
    company_id: int, 
    granularity: str = "monthly", 
    limit: int = 12, 
    session: Session = Depends(get_session)
):
    periods = []
    for offset in range(limit - 1, -1, -1):
        start_utc, end_utc = get_period_bounds(session, company_id, granularity, offset)
        if not start_utc: continue
        expenses = session.exec(
            select(Expense).where(Expense.company_id == company_id).where(Expense.date >= start_utc, Expense.date < end_utc)
        ).all()
        periods.append({
            "label": period_label(session, company_id, granularity, offset),
            "amount": sum(e.amount for e in expenses),
            "count": len(expenses)
        })
    return {"periods": periods}

@router.post("/")
def create_expense(expense: Expense, session: Session = Depends(get_session)):
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, session: Session = Depends(get_session)):
    db_expense = session.get(Expense, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Dépense non trouvée")
    session.delete(db_expense)
    session.commit()
    return {"message": "Dépense supprimée"}
