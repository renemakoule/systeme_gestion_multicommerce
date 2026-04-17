from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from datetime import datetime, date, time, timedelta
from typing import List, Dict, Optional
from database.db import get_session
from database.models import Sale, SaleItem, Product, InventoryLog, Ticket, User, Company
from sqlalchemy import and_
from sqlalchemy.orm import joinedload
from services.time_utils import get_company_offset, to_local, to_utc

router = APIRouter(prefix="/sales", tags=["sales"])

# ─────────────────────────────────────────────────────────────────────────────
# UTILITAIRE : Calculer les bornes d'une période avec un décalage (offset)
# ─────────────────────────────────────────────────────────────────────────────
def get_period_bounds(session: Session, company_id: int, period: str, offset: int = 0):
    """
    Retourne (start_utc, end_utc) pour une période donnée avec un décalage.
    offset=0 → période actuelle, offset=1 → précédente...
    Utilise l'offset UTC de l'entreprise.
    """
    offset_hours = get_company_offset(session, company_id)
    now_utc = datetime.utcnow()
    now_local = to_local(now_utc, offset_hours)

    # Début de la période active (offset=0) en local
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

    # Appliquer l'offset
    if period == "daily":
        start_local = current_start_local - timedelta(days=offset)
        end_local   = start_local + timedelta(days=1)
    elif period == "weekly":
        start_local = current_start_local - timedelta(weeks=offset)
        end_local   = start_local + timedelta(weeks=1)
    elif period == "monthly":
        year  = current_start_local.year
        month = current_start_local.month - offset
        while month <= 0:
            month += 12
            year -= 1
        start_local = current_start_local.replace(year=year, month=month, day=1)
        next_month = start_local.month + 1
        next_year  = start_local.year
        if next_month > 12:
            next_month = 1
            next_year += 1
        end_local = start_local.replace(year=next_year, month=next_month, day=1)
    elif period == "yearly":
        start_local = current_start_local.replace(year=current_start_local.year - offset)
        end_local   = start_local.replace(year=start_local.year + 1)

    # Conversion UTC
    return to_utc(start_local, offset_hours), to_utc(end_local, offset_hours)


def period_label(session: Session, company_id: int, period: str, offset: int) -> str:
    """Génère un label lisible pour la période."""
    offset_hours = get_company_offset(session, company_id)
    now_utc = datetime.utcnow()
    now_local = to_local(now_utc, offset_hours)

    MONTHS_FR = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                 "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

    if period == "daily":
        d = (now_local - timedelta(days=offset)).date()
        return d.strftime("%d/%m/%Y")
    elif period == "weekly":
        start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        start -= timedelta(days=now_local.weekday())
        start -= timedelta(weeks=offset)
        week_num = start.isocalendar()[1]
        return f"Semaine {week_num} ({start.strftime('%d/%m')})"
    elif period == "monthly":
        month = now_local.month - offset
        year  = now_local.year
        while month <= 0:
            month += 12
            year -= 1
        return f"{MONTHS_FR[month]} {year}"
    elif period == "yearly":
        return str(now_local.year - offset)
    return ""


@router.post("/")
def create_sale(sale_data: Dict, session: Session = Depends(get_session)):
    new_sale = Sale(
        company_id=sale_data["company_id"],
        user_id=sale_data["user_id"],
        total_amount=sale_data["total_amount"],
        payment_method=sale_data["payment_method"]
    )
    session.add(new_sale)
    session.commit()
    session.refresh(new_sale)
    
    for item in sale_data["items"]:
        sale_item = SaleItem(
            sale_id=new_sale.id,
            product_id=item["id"],
            quantity=item["qty"],
            unit_price=item["price"],
            total=item["qty"] * item["price"]
        )
        session.add(sale_item)
        product = session.get(Product, item["id"])
        if product:
            product.quantity -= item["qty"]
            session.add(product)
            log = InventoryLog(
                product_id=item["id"],
                user_id=sale_data["user_id"],
                change_qty=-item["qty"],
                type="OUT",
                reason=f"Vente #{new_sale.id}"
            )
            session.add(log)
            
    last_ticket = session.exec(select(func.count(Ticket.id)).where(Ticket.company_id == sale_data["company_id"])).one()
    ticket_number = f"#{10000 + last_ticket + 1}"
    
    new_ticket = Ticket(
        company_id=sale_data["company_id"],
        sale_id=new_sale.id,
        ticket_number=ticket_number
    )
    session.add(new_ticket)
    session.commit()
    return {"message": "Vente enregistrée avec succès", "sale_id": new_sale.id, "ticket_number": ticket_number}


@router.get("/summary-by-period")
def get_summary_by_period(
    company_id: int,
    granularity: str = "monthly",
    limit: int = 12,
    user_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    results = []
    for offset in range(limit - 1, -1, -1):
        start_utc, end_utc = get_period_bounds(session, company_id, granularity, offset)
        if start_utc is None: continue

        stmt = select(Sale).where(Sale.company_id == company_id, Sale.timestamp >= start_utc, Sale.timestamp < end_utc)
        if user_id: stmt = stmt.where(Sale.user_id == user_id)

        sales = session.exec(stmt).all()
        completed = [s for s in sales if s.status == "completed"]
        cancelled = [s for s in sales if s.status == "cancelled"]
        ca = sum(s.total_amount for s in completed) - sum(s.total_amount for s in cancelled)

        results.append({
            "label":      period_label(session, company_id, granularity, offset),
            "offset":     offset,
            "ca":         max(0, ca),
            "nb_ventes":  len(completed),
            "annulations": len(cancelled),
            "start":      start_utc.isoformat(),
            "end":        end_utc.isoformat(),
        })
    return {"granularity": granularity, "periods": results}


@router.get("/")
def list_sales(
    company_id: int,
    period: str = "daily",
    offset: int = 0,
    user_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    statement = select(Sale, User.name).join(User, Sale.user_id == User.id).where(Sale.company_id == company_id)
    if period != "all":
        start_utc, end_utc = get_period_bounds(session, company_id, period, offset)
        if start_utc and end_utc:
            statement = statement.where(Sale.timestamp >= start_utc, Sale.timestamp < end_utc)
    if user_id: statement = statement.where(Sale.user_id == user_id)
    statement = statement.order_by(Sale.timestamp.desc())
    results = session.exec(statement).all()
    sales_list = []
    for sale, user_name in results:
        sale_data = sale.model_dump()
        sale_data["user_name"] = user_name
        sales_list.append(sale_data)
    return sales_list


@router.get("/{sale_id}")
def get_sale_details(sale_id: int, session: Session = Depends(get_session)):
    statement = select(Sale, Company.name, Company.logo_url).join(Company, Sale.company_id == Company.id).options(joinedload(Sale.items).joinedload(SaleItem.product)).where(Sale.id == sale_id)
    result = session.exec(statement).unique().first()
    if not result: raise HTTPException(status_code=404, detail="Vente non trouvée")
    sale, company_name, logo_url = result
    res = sale.model_dump()
    res["company_name"] = company_name
    res["logo_url"] = logo_url
    res["items"] = []
    for item in sale.items:
        item_data = item.model_dump()
        item_data["product_name"] = item.product.name if item.product else "Produit supprimé"
        res["items"].append(item_data)
    return res


@router.get("/ticket/{ticket_number}")
def get_sale_by_ticket(ticket_number: str, session: Session = Depends(get_session)):
    ticket_stmt = select(Ticket).where(Ticket.ticket_number == ticket_number)
    db_ticket = session.exec(ticket_stmt).first()
    if not db_ticket:
        if ticket_number.startswith("#"): ticket_stmt = select(Ticket).where(Ticket.ticket_number == ticket_number[1:])
        else: ticket_stmt = select(Ticket).where(Ticket.ticket_number == f"#{ticket_number}")
        db_ticket = session.exec(ticket_stmt).first()
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket non trouvé")
    return get_sale_details(db_ticket.sale_id, session)


@router.post("/{sale_id}/cancel")
def cancel_sale(sale_id: int, session: Session = Depends(get_session)):
    sale = session.exec(select(Sale).where(Sale.id == sale_id)).first()
    if not sale: raise HTTPException(status_code=404, detail="Vente non trouvée")
    if sale.status == "cancelled": raise HTTPException(status_code=400, detail="Cette vente est déjà annulée")
    sale.status = "cancelled"
    session.add(sale)
    sale_items = session.exec(select(SaleItem).where(SaleItem.sale_id == sale_id)).all()
    for item in sale_items:
        product = session.get(Product, item.product_id)
        if product:
            product.quantity += item.quantity
            session.add(product)
            log = InventoryLog(product_id=product.id, user_id=sale.user_id, change_qty=item.quantity, type="RETURN", reason=f"Annulation Vente #{sale.id}")
            session.add(log)
    session.commit()
    return {"message": "Vente annulée avec succès, stocks restaurés"}


@router.get("/session-summary")
def get_session_summary(company_id: int, user_id: int, session: Session = Depends(get_session)):
    offset = get_company_offset(session, company_id)
    now_utc = datetime.utcnow()
    now_local = to_local(now_utc, offset)
    start_of_day_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_day_utc = to_utc(start_of_day_local, offset)
    
    statement = select(Sale).where(Sale.company_id == int(company_id), Sale.user_id == int(user_id), Sale.timestamp >= start_of_day_utc).order_by(Sale.timestamp.desc())
    sales = session.exec(statement).all()
    total_sales = sum(s.total_amount for s in sales)
    sale_count = len(sales)
    
    payment_methods = {}
    for s in sales:
        method = s.payment_method or "cash"
        payment_methods[method] = payment_methods.get(method, 0) + s.total_amount
    payment_breakdown = [{"method": m, "amount": a} for m, a in payment_methods.items()]
    
    recent_transactions = []
    for s in sales[:10]:
        recent_transactions.append({
            "id": s.id, "amount": s.total_amount, "method": s.payment_method or "cash",
            "time": to_local(s.timestamp, offset).strftime("%H:%M")
        })
    
    return {
        "total_sales": total_sales, "sale_count": sale_count, "payment_breakdown": payment_breakdown,
        "recent_transactions": recent_transactions,
        "start_time": to_local(sales[-1].timestamp, offset).strftime("%H:%M") if sales else "N/A"
    }
