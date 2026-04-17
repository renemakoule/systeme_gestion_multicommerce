from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database.db import get_session
from database.models import Supplier

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

@router.get("/", response_model=List[Supplier])
def list_suppliers(company_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Supplier).where(Supplier.company_id == company_id)).all()

@router.post("/")
def create_supplier(supplier: Supplier, session: Session = Depends(get_session)):
    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    return supplier

@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int, session: Session = Depends(get_session)):
    db_supplier = session.get(Supplier, supplier_id)
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    session.delete(db_supplier)
    session.commit()
    return {"message": "Fournisseur supprimé"}
