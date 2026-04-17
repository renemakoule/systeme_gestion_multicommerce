from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database.db import get_session
from database.models import User
from services.auth import get_password_hash

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[User])
def list_users(company_id: int, session: Session = Depends(get_session)):
    return session.exec(select(User).where(User.company_id == company_id)).all()

@router.post("/")
def add_user(user: User, session: Session = Depends(get_session)):
    user.password_hash = get_password_hash(user.password_hash) # Temporaire: on hash le password brut reçu
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.put("/{user_id}")
def update_user(user_id: int, user_data: dict, session: Session = Depends(get_session)):
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Mise à jour des champs (si présents dans user_data)
    if "name" in user_data: db_user.name = user_data["name"]
    if "role" in user_data: db_user.role = user_data["role"]
    if "username" in user_data: db_user.username = user_data["username"]
    if "is_active" in user_data: db_user.is_active = user_data["is_active"]
    
    # Mise à jour du mot de passe si fourni
    if "password_hash" in user_data and user_data["password_hash"]:
        db_user.password_hash = get_password_hash(user_data["password_hash"])
        
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session)):
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    session.delete(db_user)
    session.commit()
    return {"message": "Utilisateur supprimé"}
