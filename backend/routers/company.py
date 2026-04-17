from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, BackgroundTasks
import os
import shutil
from datetime import datetime
from sqlmodel import Session, select, or_
from database.db import get_session
from database.models import Company, SystemMessage, TechnicalNotification


router = APIRouter(prefix="/companies", tags=["companies"])

@router.get("/{company_id}")
def get_company(company_id: int, session: Session = Depends(get_session)):
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Établissement non trouvé")
    return company

@router.put("/{company_id}")
def update_company(company_id: int, updated_data: dict, session: Session = Depends(get_session)):
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Établissement non trouvé")
    
    for key, value in updated_data.items():
        if hasattr(company, key) and key not in ["id", "created_at"]:
            setattr(company, key, value)
            
    session.add(company)
    session.commit()
    session.refresh(company)
    return company

@router.post("/{company_id}/logo")
def upload_company_logo(company_id: int, file: UploadFile = File(...), session: Session = Depends(get_session)):
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Établissement non trouvé")
    
    # 1. Calculer le chemin absolu
    file_extension = file.filename.split(".")[-1]
    filename = f"company_{company_id}.{file_extension}"
    
    # On se base sur l'emplacement de ce fichier router
    router_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(router_dir)
    upload_dir = os.path.join(backend_dir, "static", "uploads", "logos")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, filename)
    
    # 2. Sauvegarder le fichier
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    
    # Mettre à jour l'URL dans la DB
    company.logo_url = f"http://127.0.0.1:8001/{file_path}"
    session.add(company)
    session.commit()
    session.refresh(company)
    
    return {"logo_url": company.logo_url}

@router.get("/{company_id}/broadcast/active")
def get_active_broadcasts(company_id: int, session: Session = Depends(get_session)):
    """Récupère les messages et requêtes de satisfaction actifs pour le client."""
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Etablissement non trouvé")
        
    # 1. Chercher le dernier message système actif (général ou spécifique)
    message = session.exec(
        select(SystemMessage)
        .where(or_(SystemMessage.company_id == company_id, SystemMessage.company_id == None))
        .where(SystemMessage.is_active == True)
        .order_by(SystemMessage.created_at.desc())
    ).first()
    
    return {
        "satisfaction_prompt": company.rating_prompt_triggered,
        "current_rating": company.rating,
        "message": message
    }

@router.get("/{company_id}/rating-status")

def get_rating_status(company_id: int, session: Session = Depends(get_session)):
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Établissement non trouvé")
    
    # Si le client a déjà atteint 5 étoiles, on ne demande plus rien
    if company.rating >= 5 or not company.rating_prompt_enabled:
        return {"should_prompt": False}
    
    # Vérifier l'intervalle
    if not company.last_rating_prompt_date:
        return {"should_prompt": True}
        
    now = datetime.utcnow()
    diff = now - company.last_rating_prompt_date
    
    should_prompt = False
    if company.rating_prompt_interval == "daily" and diff.days >= 1:
        should_prompt = True
    elif company.rating_prompt_interval == "weekly" and diff.days >= 7:
        should_prompt = True
    elif company.rating_prompt_interval == "monthly" and diff.days >= 30:
        should_prompt = True
        
    return {"should_prompt": should_prompt, "current_rating": company.rating}

@router.post("/{company_id}/rate")
def submit_rating(company_id: int, rating_data: dict, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    # rating_data: { "stars": 4 }
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Établissement non trouvé")
    
    stars = rating_data.get("stars", 0)
    if not (1 <= stars <= 5):
        raise HTTPException(status_code=400, detail="Note invalide (doit être entre 1 et 5)")
        
    company.rating = stars
    company.last_rating_prompt_date = datetime.utcnow()
    company.rating_prompt_triggered = False # Reset le trigger manuel si présent
    
    session.add(company)

    # 1. Créer une notification technique pour l'avis
    notif = TechnicalNotification(
        type="NEW_RATING",
        title="Nouvel Avis Client",
        content=f"'{company.name}' a donné une note de {stars}/5 étoiles.",
        company_id=company_id
    )
    session.add(notif)
    session.commit()
    session.refresh(company)

    # 2. Broadcast WebSocket via BackgroundTasks (évite blocage et assure exécution)
    from services.websocket import manager
    background_tasks.add_task(manager.broadcast, {
        "type": "NEW_RATING",
        "notif_id": notif.id,
        "company_id": company_id,
        "company_name": company.name,
        "stars": stars
    })
    
    return {"message": "Merci pour votre avis !", "new_rating": company.rating}

