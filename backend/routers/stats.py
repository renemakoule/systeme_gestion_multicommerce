from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from database.db import get_session
from database.models import Sale, Product, User, Category, SaleItem, Expense, InventoryLog
from datetime import datetime, timedelta
from typing import List, Dict
from services.time_utils import get_company_offset, to_local, to_utc, get_french_day_name

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/overview")
def get_overview(company_id: int, period: str = "daily", session: Session = Depends(get_session)):
    # 1. RÉCUPÉRATION OFFSET ET TEMPS
    offset = get_company_offset(session, company_id)
    now_utc = datetime.utcnow()
    now_local = to_local(now_utc, offset)
    
    current_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if period == "daily":
        pass 
    elif period == "weekly":
        current_start_local = current_start_local - timedelta(days=now_local.weekday())
    elif period == "monthly":
        current_start_local = current_start_local.replace(day=1)
    elif period == "yearly":
        current_start_local = current_start_local.replace(month=1, day=1)

    # Calculer la fin de la période
    if period == "daily":
        current_end_local = current_start_local + timedelta(days=1)
    elif period == "weekly":
        current_end_local = current_start_local + timedelta(weeks=1)
    elif period == "monthly":
        next_month = current_start_local.month + 1 if current_start_local.month < 12 else 1
        next_year = current_start_local.year if current_start_local.month < 12 else current_start_local.year + 1
        current_end_local = current_start_local.replace(year=next_year, month=next_month, day=1)
    elif period == "yearly":
        current_end_local = current_start_local.replace(year=current_start_local.year + 1)
    else:
        current_end_local = current_start_local + timedelta(days=1)

    previous_start_local = current_start_local - (current_end_local - current_start_local)

    current_start = to_utc(current_start_local, offset)
    current_end = to_utc(current_end_local, offset)
    previous_start = to_utc(previous_start_local, offset)
    today_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = to_utc(today_start_local, offset)
    
    # 2. VENTES PERIODE COURANTE
    sales_current = session.exec(select(Sale).where(Sale.company_id == company_id, Sale.timestamp >= current_start, Sale.timestamp < current_end)).all()
    ca_current = sum(s.total_amount if s.status == "completed" else -s.total_amount for s in sales_current)
    clients_current = len([s for s in sales_current if s.status == "completed"])
    
    # 3. VENTES PERIODE PRECEDENTE
    sales_previous = session.exec(select(Sale).where(Sale.company_id == company_id, Sale.timestamp >= previous_start, Sale.timestamp < current_start)).all()
    ca_previous = sum(s.total_amount if s.status == "completed" else -s.total_amount for s in sales_previous)
    clients_previous = len([s for s in sales_previous if s.status == "completed"])
    
    # 4. CALCUL DES PANIER MOYENS
    basket_current = ca_current / clients_current if clients_current > 0 else 0
    basket_previous = ca_previous / clients_previous if clients_previous > 0 else 0
    
    # 5. CALCUL MOYENNE ARTICLES / VENTE
    def get_items_avg(start, end=None):
        query = select(func.count(SaleItem.id)).join(Sale).where(Sale.company_id == company_id, Sale.timestamp >= start)
        if end: query = query.where(Sale.timestamp < end)
        total_items = session.exec(query).one() or 0
        total_sales = len(session.exec(select(Sale).where(Sale.company_id == company_id, Sale.timestamp >= start, Sale.timestamp < (end or now_utc))).all())
        return total_items / total_sales if total_sales > 0 else 0

    items_avg_current = get_items_avg(current_start)
    items_avg_previous = get_items_avg(previous_start, current_start)

    # 6. CALCUL DES DELTAS (%)
    def calc_delta(curr, prev):
        if prev == 0: return "+0%" if curr == 0 else "+100%"
        diff = ((curr - prev) / prev) * 100
        return f"{diff:+.1f}%"

    ca_delta = calc_delta(ca_current, ca_previous)
    clients_delta = calc_delta(clients_current, clients_previous)
    basket_delta = calc_delta(basket_current, basket_previous)
    items_delta = calc_delta(items_avg_current, items_avg_previous)
    
    # 7. ALERTES & GRAPHIQUES
    stock_alerts = session.exec(select(func.count(Product.id)).where(Product.company_id == company_id, Product.quantity <= Product.min_threshold)).one()
    
    chart_data = []
    for i in range(6, -1, -1):
        day_local = today_start_local - timedelta(days=i)
        day_utc = to_utc(day_local, offset)
        next_day_utc = day_utc + timedelta(days=1)
        
        day_sales = session.exec(select(Sale).where(Sale.company_id == company_id, Sale.timestamp >= day_utc, Sale.timestamp < next_day_utc)).all()
        
        day_ca = sum(s.total_amount if s.status == "completed" else -s.total_amount for s in day_sales)
        completed_sales_count = len([s for s in day_sales if s.status == "completed"])
        
        chart_data.append({
            "name": get_french_day_name(day_local), 
            "ca": max(0, day_ca), 
            "sales": completed_sales_count
        })

    # ... [Rest of the logic remains mostly the same, ensuring all timeframe queries use current_start/current_end]
    
    # 8. RÉPARTITION PAR CATÉGORIE (Ventes du jour)
    category_stats = session.exec(
        select(Category.name, Sale.status, func.sum(SaleItem.total), func.sum(SaleItem.quantity))
        .join(Product, Category.id == Product.category_id)
        .join(SaleItem, Product.id == SaleItem.product_id)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(Category.company_id == company_id)
        .where(Sale.timestamp >= current_start)
        .group_by(Category.name, Sale.status)
    ).all()
    
    by_category_map = {}
    for name, status, total, qty in category_stats:
        val = total or 0
        q = qty or 0
        if status == "cancelled": 
            val = -val
            q = -q
        if name not in by_category_map:
            by_category_map[name] = {"value": 0, "qty": 0}
        by_category_map[name]["value"] += val
        by_category_map[name]["qty"] += q
    by_category = [{"name": name, "value": v["value"], "qty": v["qty"]} for name, v in by_category_map.items()]

    # 9. RÉPARTITION DÉPENSES
    expense_stats = session.exec(
        select(Expense.category, func.sum(Expense.amount))
        .where(Expense.company_id == company_id, Expense.date >= current_start, Expense.date < current_end)
        .group_by(Expense.category)
    ).all()
    expenses_by_category = [{"name": cat, "value": total or 0} for cat, total in expense_stats]
    total_expenses = sum(cat["value"] for cat in expenses_by_category)

    # 10. CALCULS AVANCÉS (COGS, Procurement...)
    cogs_raw = session.exec(
        select(Sale.status, func.sum(SaleItem.quantity * Product.cost_price))
        .join(Sale, SaleItem.sale_id == Sale.id)
        .join(Product, SaleItem.product_id == Product.id)
        .where(Sale.company_id == company_id, Sale.timestamp >= current_start, Sale.timestamp < current_end)
        .group_by(Sale.status)
    ).all()
    total_cogs = 0
    for status, cogs in cogs_raw:
        if status == "completed": total_cogs += (cogs or 0)
        else: total_cogs -= (cogs or 0)

    total_procurement = session.exec(
        select(func.sum(InventoryLog.change_qty * Product.cost_price))
        .join(Product, InventoryLog.product_id == Product.id)
        .where(Product.company_id == company_id, InventoryLog.type == "IN", InventoryLog.timestamp >= current_start, InventoryLog.timestamp < current_end)
    ).one() or 0

    # MÉTRIQUES PAR CATÉGORIE
    categories_map = {}
    sales_stats = session.exec(
        select(Category.name, Sale.status, func.sum(SaleItem.total), func.sum(SaleItem.quantity * Product.cost_price))
        .join(Product, SaleItem.product_id == Product.id)
        .outerjoin(Category, Product.category_id == Category.id)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(Product.company_id == company_id, Sale.timestamp >= current_start, Sale.timestamp < current_end)
        .group_by(Category.name, Sale.status)
    ).all()

    for name, status, rev, cogs in sales_stats:
        cat_name = name or "Général"
        if cat_name not in categories_map:
            categories_map[cat_name] = {"revenue": 0, "cogs": 0, "procurement": 0}
        rev_val = rev or 0
        cogs_val = cogs or 0
        if status == "cancelled":
            rev_val = -rev_val
            cogs_val = -cogs_val
        categories_map[cat_name]["revenue"] += rev_val
        categories_map[cat_name]["cogs"] += cogs_val

    proc_stats = session.exec(
        select(Category.name, func.sum(InventoryLog.change_qty * Product.cost_price))
        .join(Product, InventoryLog.product_id == Product.id)
        .outerjoin(Category, Product.category_id == Category.id)
        .where(Product.company_id == company_id, InventoryLog.type == "IN", InventoryLog.timestamp >= current_start, InventoryLog.timestamp < current_end)
        .group_by(Category.name)
    ).all()
    for name, proc in proc_stats:
        cat_name = name or "Général"
        if cat_name not in categories_map:
            categories_map[cat_name] = {"revenue": 0, "cogs": 0, "procurement": 0}
        categories_map[cat_name]["procurement"] += proc or 0

    metrics_by_category = []
    for name, vals in categories_map.items():
        rev = vals["revenue"]
        cogs = vals["cogs"]
        metrics_by_category.append({
            "name": name, "revenue": rev, "cogs": cogs, "procurement": vals["procurement"],
            "gain": rev - cogs, "margin": round(((rev - cogs) / rev * 100), 1) if rev > 0 else 0
        })
    metrics_by_category.sort(key=lambda x: (x["revenue"], x["procurement"]), reverse=True)

    # 11. AFFLUENCE HORAIRE
    from sqlalchemy import extract
    hourly_raw = session.exec(
        select(extract('hour', Sale.timestamp).label("hour"), func.count(Sale.id).label("count"))
        .where(Sale.company_id == company_id, Sale.timestamp >= current_start, Sale.timestamp < current_end, Sale.status == "completed")
        .group_by(extract('hour', Sale.timestamp))
    ).all()
    
    # On ajuste l'heure pour l'affichage local (+ offset)
    hourly_map = {(int(h) + offset) % 24: count for h, count in hourly_raw}
    hourly_data = []
    for h in range(8, 22):
        hourly_data.append({"time": f"{h}h", "sales": hourly_map.get(h, 0)})

    return {
        "ca_today": ca_current, "ca_delta": ca_delta, "clients_today": clients_current, "clients_delta": clients_delta,
        "basket_today": basket_current, "basket_delta": basket_delta, "items_today": round(items_avg_current, 1),
        "items_delta": items_delta, "stock_alerts": stock_alerts, "chart_data": chart_data, "by_category": by_category,
        "expenses_by_category": expenses_by_category, "total_expenses": total_expenses, "total_cogs": total_cogs,
        "total_procurement": total_procurement, "total_gain": ca_current - total_cogs,
        "metrics_by_category": metrics_by_category, "hourly_data": hourly_data
    }

@router.get("/activity")
def get_activity(company_id: int, session: Session = Depends(get_session)):
    offset = get_company_offset(session, company_id)
    latest_sales = session.exec(select(Sale).where(Sale.company_id == company_id).order_by(Sale.timestamp.desc()).limit(5)).all()
    latest_expenses = session.exec(select(Expense).where(Expense.company_id == company_id).order_by(Expense.date.desc()).limit(5)).all()
    latest_logs = session.exec(select(InventoryLog, Product.name).join(Product, InventoryLog.product_id == Product.id).where(Product.company_id == company_id, InventoryLog.type == "IN").order_by(InventoryLog.timestamp.desc()).limit(5)).all()
    
    activities = []
    for s in latest_sales:
        activities.append({
            "id": f"sale_{s.id}", "title": f"Vente encaissée ({s.total_amount:,.0f} CFA)",
            "time": to_local(s.timestamp, offset), "type": "sale"
        })
    for e in latest_expenses:
        activities.append({
            "id": f"exp_{e.id}", "title": f"Dépense réglée : {e.category} ({e.amount:,.0f} CFA)",
            "time": to_local(e.date, offset), "type": "expense"
        })
    for log, prod_name in latest_logs:
        activities.append({
            "id": f"stock_{log.id}", "title": f"Entrée Stock : +{log.change_qty} {prod_name}",
            "time": to_local(log.timestamp, offset), "type": "stock"
        })
    activities.sort(key=lambda x: x["time"], reverse=True)
    return activities[:10]
