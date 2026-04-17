from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from database.models import Budget, Product, InventoryLog, Expense
from datetime import datetime
from typing import List
from database.db import get_session

router = APIRouter(prefix="/budgets", tags=["budgets"])

@router.get("/status")
def get_budgets_status(company_id: int, month: int, year: int, session: Session = Depends(get_session)):
    categories = ["Stock", "Loyer", "Salaires", "Énergie", "Autre"]
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    results = {}
    
    for cat in categories:
        spent = 0.0
        if cat == "Stock":
            # 1. Calculer la valeur financière de l'inventaire actuel (Stock immobilisé)
            statement_prod = select(Product).where(Product.company_id == company_id)
            products = session.exec(statement_prod).all()
            inventory_value = sum(p.quantity * p.cost_price for p in products)
            
            # 2. Ajouter les dépenses manuelles enregistrées en 'Stock' pour le mois
            statement_exp = select(func.sum(Expense.amount)).where(
                Expense.company_id == company_id,
                Expense.category == "Stock",
                Expense.date >= start_date,
                Expense.date < end_date
            )
            manual_stock_exp = session.exec(statement_exp).one() or 0.0
            
            spent = inventory_value + manual_stock_exp
        else:
            # Calculer la somme des dépenses pour cette catégorie
            statement = select(func.sum(Expense.amount)).where(
                Expense.company_id == company_id,
                Expense.category == cat,
                Expense.date >= start_date,
                Expense.date < end_date
            )
            spent = session.exec(statement).one() or 0.0
            
        results[cat] = spent
        
    return results

@router.get("/", response_model=List[Budget])
def list_budgets(company_id: int, month: int, year: int, session: Session = Depends(get_session)):
    return session.exec(select(Budget).where(
        Budget.company_id == company_id, 
        Budget.month == month, 
        Budget.year == year
    )).all()

@router.post("/")
def create_or_update_budget(budget: Budget, session: Session = Depends(get_session)):
    # Check if budget exists for this category/month/year
    statement = select(Budget).where(
        Budget.company_id == budget.company_id,
        Budget.category == budget.category,
        Budget.month == budget.month,
        Budget.year == budget.year
    )
    existing = session.exec(statement).first()
    
    if existing:
        existing.amount = budget.amount
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
        
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget
