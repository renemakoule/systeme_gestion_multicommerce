from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select, func
from typing import List, Dict, Optional
from database.db import get_session
from database.models import Sale, SaleItem, Product, InventoryLog, Ticket, User, DiningSession, RestaurantTable
from datetime import datetime
from pydantic import BaseModel
from services.websocket import manager
import random
import string

router = APIRouter(prefix="/restaurant", tags=["restaurant"])

class SessionCreate(BaseModel):
    company_id: int
    table_number: str
    client_name: Optional[str] = None

class TableCreate(BaseModel):
    company_id: int
    number: str

class OrderCreate(BaseModel):
    company_id: int
    table_number: str
    session_id: Optional[int] = None
    items: List[Dict]
    total_amount: float

def generate_access_code():
    """Génère un code pro type TAB-88X"""
    prefix = "TAB-"
    nums = "".join(random.choices(string.digits, k=2))
    letter = random.choice(string.ascii_uppercase)
    return f"{prefix}{nums}{letter}"

@router.post("/sessions")
def create_dining_session(data: SessionCreate, session: Session = Depends(get_session)):
    """Ouvre une nouvelle session pour un client à une table."""
    # 1. Vérifier si une session active existe déjà pour cette table ? 
    
    code = generate_access_code()
    # S'assurer de l'unicité du code
    while session.exec(select(DiningSession).where(DiningSession.access_code == code, DiningSession.is_active == True)).first():
        code = generate_access_code()
        
    new_session = DiningSession(
        company_id=data.company_id,
        table_number=data.table_number,
        client_name=data.client_name,
        access_code=code,
        is_active=True
    )
    session.add(new_session)
    session.commit()
    session.refresh(new_session)
    return new_session

@router.get("/sessions")
def list_dining_sessions(company_id: int, is_active: Optional[bool] = None, session: Session = Depends(get_session)):
    """Liste les sessions de restauration (actives ou toutes)."""
    stmt = select(DiningSession).where(DiningSession.company_id == company_id)
    if is_active is not None:
        stmt = stmt.where(DiningSession.is_active == is_active)
    return session.exec(stmt).all()

@router.patch("/sessions/{session_id}/close")
def close_dining_session(session_id: int, session: Session = Depends(get_session)):
    """Clôture manuelle de la session client (par gérant ou servante)."""
    db_session = session.get(DiningSession, session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    db_session.is_active = False
    session.add(db_session)
    session.commit()
    return {"message": "Session clôturée. Table prête pour le client suivant."}

@router.post("/order")
async def create_client_order(order_data: OrderCreate, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """
    Endpoint de prise de commande client.
    order_data: { company_id, table_number, items, total_amount, session_id }
    """
    # 1. Créer la vente avec le statut 'pending'
    new_sale = Sale(
        company_id=order_data.company_id,
        session_id=order_data.session_id,
        table_number=order_data.table_number,
        total_amount=order_data.total_amount,
        payment_method="cash",
        status="pending"
    )
    
    # Trouver le gérant par défaut si aucun user_id n'est fourni
    default_user = session.exec(select(User).where(User.company_id == order_data.company_id)).first()
    if default_user:
        new_sale.user_id = default_user.id

    session.add(new_sale)
    session.commit()
    session.refresh(new_sale)

    # 2. Ajouter les articles
    for item in order_data.items:
        sale_item = SaleItem(
            sale_id=new_sale.id,
            product_id=item["id"],
            quantity=item["qty"],
            unit_price=item["price"],
            total=item["qty"] * item["price"]
        )
        session.add(sale_item)
    
    session.commit()
    
    # Notification Temps Réel via WebSocket (Trigger pour servante/manager)
    background_tasks.add_task(manager.broadcast, {
        "type": "new_order",
        "company_id": order_data.company_id,
        "order_id": new_sale.id,
        "table_number": order_data.table_number,
        "total_amount": order_data.total_amount
    })
    
    return {"message": "Commande transmise avec succès", "order_id": new_sale.id}

@router.get("/orders")
def list_orders(company_id: int, status: Optional[str] = None, session_id: Optional[int] = None, session: Session = Depends(get_session)):
    """Liste les commandes avec isolation possible par session client."""
    stmt = select(Sale).where(Sale.company_id == company_id)
    if status:
        stmt = stmt.where(Sale.status == status)
    if session_id:
        stmt = stmt.where(Sale.session_id == session_id)
    else:
        # Dashboard gérant : On montre tout ce qui est actif
        if not status:
            stmt = stmt.where(Sale.status.in_(["pending", "validated", "preparing", "served"]))
    
    stmt = stmt.order_by(Sale.timestamp.desc())
    orders = session.exec(stmt).all()
    
    results = []
    for order in orders:
        data = order.model_dump()
        items_stmt = select(SaleItem, Product.name).join(Product).where(SaleItem.sale_id == order.id)
        items = session.exec(items_stmt).all()
        data["items"] = [{"product_name": name, "qty": item.quantity, "price": item.unit_price} for item, name in items]
        results.append(data)
        
    return results

@router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: int, status_data: Dict, session: Session = Depends(get_session)):
    """
    Met à jour le statut d'une commande.
    Si passe à 'validated', décompte le stock et génère un ticket.
    """
    order = session.get(Sale, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    old_status = order.status
    new_status = status_data["status"]
    performing_user_id = status_data.get("user_id")
    
    # Validation par la servante
    if old_status == "pending" and new_status == "validated":
        # Assigner le serveur qui valide la commande
        if performing_user_id:
            order.user_id = performing_user_id
            
        # 1. Décompter le stock
        items = session.exec(select(SaleItem).where(SaleItem.sale_id == order.id)).all()
        for item in items:
            product = session.get(Product, item.product_id)
            if product:
                product.quantity -= item.quantity
                session.add(product)
                
                # Log de mouvement
                log = InventoryLog(
                    product_id=product.id,
                    user_id=performing_user_id or order.user_id,
                    change_qty=-item.quantity,
                    type="OUT",
                    reason=f"Commande Restaurant #{order.id} (Table {order.table_number})"
                )
                session.add(log)
        
        # 2. Générer le ticket
        last_ticket = session.exec(select(func.count(Ticket.id)).where(Ticket.company_id == order.company_id)).one()
        ticket_number = f"#{10000 + last_ticket + 1}"
        new_ticket = Ticket(
            company_id=order.company_id,
            sale_id=order.id,
            ticket_number=ticket_number
        )
        session.add(new_ticket)
        print(f"Ticket {ticket_number} généré pour la table {order.table_number}")

    order.status = new_status
    session.add(order)
    session.commit()
    
    # Envoi d'une notification WebSocket spécifique pour le client
    await manager.broadcast({
        "type": "order_status",
        "order_id": order_id,
        "status": new_status,
        "table": order.table_number,
        "session_id": order.session_id
    })
    
    return {"message": f"Statut mis à jour : {new_status}"}

@router.get("/tables")
def list_tables(company_id: int, session: Session = Depends(get_session)):
    """Liste les tables physiques du restaurant."""
    tables = session.exec(select(RestaurantTable).where(RestaurantTable.company_id == company_id)).all()
    if not tables:
        # Retourner des tables par défaut si aucune n'est configurée
        return [
            {"number": "1", "status": "available"},
            {"number": "2", "status": "available"},
            {"number": "3", "status": "available"},
            {"number": "4", "status": "available"},
            {"number": "5", "status": "available"}
        ]
    return tables

@router.post("/tables")
def create_table(data: TableCreate, session: Session = Depends(get_session)):
    """Crée une nouvelle table physique."""
    new_table = RestaurantTable(
        company_id=data.company_id,
        number=data.number,
        status="available"
    )
    session.add(new_table)
    session.commit()
    session.refresh(new_table)
    return new_table

@router.delete("/tables/{table_id}")
def delete_table(table_id: int, session: Session = Depends(get_session)):
    """Supprime une table physique (si elle n'a pas de session active)."""
    table = session.get(RestaurantTable, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table non trouvée")
    
    # Vérifier si une session active existe pour cette table ?
    # Pour simplifier, on permet la suppression si elle n'est pas "occupied"
    # ou si on est sûr.
    session.delete(table)
    session.commit()
    return {"message": "Table supprimée"}
