from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict
from database.db import get_session
from database.models import RolePermission

router = APIRouter(prefix="/roles", tags=["roles"])

@router.get("/permissions", response_model=List[RolePermission])
def get_permissions(company_id: int, role: str, session: Session = Depends(get_session)):
    return session.exec(
        select(RolePermission).where(
            RolePermission.company_id == company_id,
            RolePermission.role == role
        )
    ).all()

@router.post("/permissions")
def update_permissions(company_id: int, role: str, permissions: List[Dict], session: Session = Depends(get_session)):
    # Supprimer les anciennes permissions pour ce rôle
    old_perms = session.exec(
        select(RolePermission).where(
            RolePermission.company_id == company_id,
            RolePermission.role == role
        )
    ).all()
    for p in old_perms:
        session.delete(p)
    
    # Ajouter les nouvelles
    for p_data in permissions:
        new_p = RolePermission(
            company_id=company_id,
            role=role,
            module=p_data["module"],
            permission=p_data["permission"],
            is_enabled=p_data["is_enabled"]
        )
        session.add(new_p)
    
    session.commit()
    return {"message": "Permissions mises à jour"}
