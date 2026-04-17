from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List, Optional
from sqlalchemy.orm import joinedload
from database.db import get_session
from database.models import Product, Category, InventoryLog, User, Sale, SaleItem
from services.media import process_and_save_image
from datetime import datetime, timedelta
from services.time_utils import get_company_offset, to_local, to_utc, get_french_day_name

router = APIRouter(prefix="/products", tags=["products"])

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

def save_product_image(base64_str: str) -> str:
    return process_and_save_image(base64_str, folder="products")


@router.get("/stock-stats")
def get_stock_stats(company_id: int, period: Optional[str] = None, session: Session = Depends(get_session)):
    def sum_logs(log_type: str, p: str):
        start_utc, _ = get_period_bounds(session, company_id, p, 0)
        logs = session.exec(
            select(InventoryLog)
            .join(Product, InventoryLog.product_id == Product.id)
            .where(Product.company_id == company_id, InventoryLog.type == log_type, InventoryLog.timestamp >= start_utc)
        ).all()
        return sum(abs(log.change_qty) for log in logs)

    entries = {
        "daily":   sum_logs("IN", "daily"),
        "weekly":  sum_logs("IN", "weekly"),
        "monthly": sum_logs("IN", "monthly"),
        "yearly":  sum_logs("IN", "yearly"),
    }
    exits = {
        "daily":   sum_logs("OUT", "daily"),
        "weekly":  sum_logs("OUT", "weekly"),
        "monthly": sum_logs("OUT", "monthly"),
        "yearly":  sum_logs("OUT", "yearly"),
    }

    all_products = session.exec(select(Product).where(Product.company_id == company_id)).all()
    in_stock  = [p for p in all_products if p.quantity > 0]
    out_stock = [p for p in all_products if p.quantity <= 0]

    period_start_utc = None
    if period:
        period_start_utc, _ = get_period_bounds(session, company_id, period, 0)

    in_logs_query = select(InventoryLog, Product.name).join(Product, InventoryLog.product_id == Product.id).where(Product.company_id == company_id, InventoryLog.type == "IN")
    if period_start_utc:
        in_logs_query = in_logs_query.where(InventoryLog.timestamp >= period_start_utc)
    all_in_logs = session.exec(in_logs_query).all()
    top_in_agg: dict = {}
    for log, pname in all_in_logs:
        top_in_agg[pname] = top_in_agg.get(pname, 0) + abs(log.change_qty)
    top_in = sorted([{"name": k, "qty": v} for k, v in top_in_agg.items()], key=lambda x: x["qty"], reverse=True)[:5]

    out_logs_query = select(InventoryLog, Product.name).join(Product, InventoryLog.product_id == Product.id).where(Product.company_id == company_id, InventoryLog.type == "OUT")
    if period_start_utc:
        out_logs_query = out_logs_query.where(InventoryLog.timestamp >= period_start_utc)
    all_out_logs = session.exec(out_logs_query).all()
    top_out_agg: dict = {}
    for log, pname in all_out_logs:
        top_out_agg[pname] = top_out_agg.get(pname, 0) + abs(log.change_qty)
    top_out = sorted([{"name": k, "qty": v} for k, v in top_out_agg.items()], key=lambda x: x["qty"], reverse=True)[:5]

    sale_items_query = select(SaleItem, Product.name).join(Product, SaleItem.product_id == Product.id).join(Sale, SaleItem.sale_id == Sale.id).where(Sale.company_id == company_id)
    if period_start_utc:
        sale_items_query = sale_items_query.where(Sale.timestamp >= period_start_utc)
    all_sale_items = session.exec(sale_items_query).all()
    top_consumed_agg: dict = {}
    for si, pname in all_sale_items:
        top_consumed_agg[pname] = top_consumed_agg.get(pname, 0) + (si.quantity or 0)
    top_consumed = sorted([{"name": k, "qty": v} for k, v in top_consumed_agg.items()], key=lambda x: x["qty"], reverse=True)[:5]

    product_movements = []
    for p in all_products:
        p_in_stmt = select(func.sum(InventoryLog.change_qty)).where(InventoryLog.product_id == p.id, InventoryLog.type == "IN")
        if period_start_utc: p_in_stmt = p_in_stmt.where(InventoryLog.timestamp >= period_start_utc)
        p_in = session.exec(p_in_stmt).one() or 0
        p_out_stmt = select(func.sum(InventoryLog.change_qty)).where(InventoryLog.product_id == p.id, InventoryLog.type == "OUT")
        if period_start_utc: p_out_stmt = p_out_stmt.where(InventoryLog.timestamp >= period_start_utc)
        p_out = session.exec(p_out_stmt).one() or 0
        product_movements.append({
            "id": p.id, "name": p.name, "category": p.category.name if p.category else "Général",
            "total_in": abs(p_in), "total_out": abs(p_out), "current_qty": p.quantity, "unit": p.unit
        })

    return {
        "entries": entries, "exits": exits, "in_stock_count": len(in_stock), "out_stock_count": len(out_stock),
        "total_cost_value": sum(p.quantity * (p.cost_price or 0) for p in all_products),
        "total_retail_value": sum(p.quantity * (p.price or 0) for p in all_products),
        "total_qty": sum(p.quantity for p in all_products), "product_movements": product_movements,
        "top_in": top_in, "top_out": top_out, "top_consumed": top_consumed,
    }

@router.get("/logs/summary-by-period")
def get_inventory_summary(
    company_id: int, 
    granularity: str = "monthly", 
    limit: int = 12, 
    session: Session = Depends(get_session)
):
    periods = []
    for offset in range(limit - 1, -1, -1):
        start_utc, end_utc = get_period_bounds(session, company_id, granularity, offset)
        if not start_utc: continue
        logs = session.exec(
            select(InventoryLog).join(Product, InventoryLog.product_id == Product.id)
            .where(Product.company_id == company_id, InventoryLog.timestamp >= start_utc, InventoryLog.timestamp < end_utc)
        ).all()
        periods.append({
            "label": period_label(session, company_id, granularity, offset),
            "in": sum(abs(l.change_qty) for l in logs if l.type == "IN"),
            "out": sum(abs(l.change_qty) for l in logs if l.type == "OUT"),
            "count": len(logs)
        })
    return {"periods": periods}

@router.get("/", response_model=List[Product])
def list_products(company_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Product).where(Product.company_id == company_id).options(joinedload(Product.category))).all()

@router.post("/")
def create_product(product: Product, user_id: Optional[int] = None, session: Session = Depends(get_session)):
    if product.image_url and product.image_url.startswith("data:image"):
        product.image_url = save_product_image(product.image_url)
    session.add(product)
    session.commit()
    session.refresh(product)
    if product.quantity > 0:
        log = InventoryLog(product_id=product.id, user_id=user_id, change_qty=product.quantity, type="IN", reason="Stock Initial")
        session.add(log)
        session.commit()
    return product

@router.get("/categories", response_model=List[Category])
def list_categories(company_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Category).where(Category.company_id == company_id)).all()

@router.post("/categories")
def create_category(category: Category, session: Session = Depends(get_session)):
    session.add(category)
    session.commit()
    session.refresh(category)
    return category

@router.put("/categories/{category_id}")
def update_category(category_id: int, updated_category: dict, session: Session = Depends(get_session)):
    db_category = session.get(Category, category_id)
    if not db_category: raise HTTPException(status_code=404, detail="Categorie non trouvee")
    allowed_fields = ["name", "parent_id"]
    for key, value in updated_category.items():
        if key in allowed_fields:
            if key == "parent_id" and (value == "" or value == 0): setattr(db_category, key, None)
            else: setattr(db_category, key, value)
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category

@router.delete("/categories/{category_id}")
def delete_category(category_id: int, session: Session = Depends(get_session)):
    category = session.get(Category, category_id)
    if not category: raise HTTPException(status_code=404, detail="Categorie non trouvee")
    session.delete(category)
    session.commit()
    return {"message": "Categorie supprimee"}

@router.get("/logs")
def list_inventory_logs(
    company_id: int, 
    period: Optional[str] = None,
    offset: int = 0,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    offset_hours = get_company_offset(session, company_id)
    start_utc, end_utc = None, None
    if period: start_utc, end_utc = get_period_bounds(session, company_id, period, offset)
    
    statement = select(InventoryLog, Product.name, User.name, Category.name).join(Product, InventoryLog.product_id == Product.id).outerjoin(User, InventoryLog.user_id == User.id).outerjoin(Category, Product.category_id == Category.id).where(Product.company_id == company_id)
    if start_utc and end_utc: statement = statement.where(InventoryLog.timestamp >= start_utc, InventoryLog.timestamp < end_utc)
    if start_date:
        try:
            s_date_local = datetime.strptime(start_date, "%Y-%m-%d")
            statement = statement.where(InventoryLog.timestamp >= to_utc(s_date_local, offset_hours))
        except: pass
    if end_date:
        try:
            e_date_local = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
            statement = statement.where(InventoryLog.timestamp <= to_utc(e_date_local, offset_hours))
        except: pass
    if category_id: statement = statement.where(Product.category_id == category_id)
        
    statement = statement.order_by(InventoryLog.timestamp.desc())
    results = session.exec(statement).all()
    logs = []
    for log, product_name, user_name, cat_name in results:
        logs.append({
            "id": log.id, "product_name": product_name, "category_name": cat_name or "Général",
            "user_name": user_name or "Système", "change_qty": log.change_qty,
            "type": log.type, "reason": log.reason, "timestamp": to_local(log.timestamp, offset_hours)
        })
    return logs

@router.put("/{product_id}")
def update_product(product_id: int, updated_product: dict, user_id: Optional[int] = None, session: Session = Depends(get_session)):
    db_product = session.get(Product, product_id)
    if not db_product: raise HTTPException(status_code=404, detail="Produit non trouve")
    old_qty = db_product.quantity
    allowed_fields = ["name", "sku", "barcode", "price", "cost_price", "quantity", "unit", "min_threshold", "category_id", "supplier_id", "attributes", "image_url"]
    for key, value in updated_product.items():
        if key in allowed_fields:
            if key in ["category_id", "supplier_id"] and (value == "" or value == 0): setattr(db_product, key, None)
            elif key == "image_url" and value and value.startswith("data:image"): setattr(db_product, key, save_product_image(value))
            else: setattr(db_product, key, value)
    if db_product.quantity != old_qty:
        delta = db_product.quantity - old_qty
        log = InventoryLog(product_id=db_product.id, user_id=user_id, change_qty=delta, type="IN" if delta > 0 else "OUT" if delta < 0 else "ADJUSTMENT", reason="Mise a jour manuelle (Edition produit)")
        session.add(log)
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product

@router.get("/slow-moving")
def get_slow_moving_products(company_id: int, days: int = 30, session: Session = Depends(get_session)):
    offset = get_company_offset(session, company_id)
    products = session.exec(select(Product).where(Product.company_id == company_id, Product.quantity > 0)).all()
    slow_moving = []
    threshold_date_utc = datetime.utcnow() - timedelta(days=days)
    for p in products:
        last_out_log = session.exec(select(InventoryLog).where(InventoryLog.product_id == p.id, InventoryLog.type == "OUT", InventoryLog.timestamp >= threshold_date_utc)).first()
        if not last_out_log:
            slow_moving.append({"id": p.id, "name": p.name, "quantity": p.quantity, "unit": p.unit, "price": p.price, "last_movement": "Aucune vente récente"})
    return slow_moving

@router.delete("/{product_id}")
def delete_product(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product: raise HTTPException(status_code=404, detail="Produit non trouve")
    session.delete(product)
    session.commit()
    return {"message": "Produit supprime"}
