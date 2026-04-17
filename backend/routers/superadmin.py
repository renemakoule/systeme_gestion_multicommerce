from fastapi import APIRouter, Depends, HTTPException, Header, Security, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import os
from jose import jwt, JWTError

from database.db import get_session, get_cloud_session, engine, cloud_engine
from database.models import Company, SuperAdmin, SystemMessage, TechnicalNotification
from services.auth import verify_password, get_password_hash, create_access_token, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from services.media import process_and_save_image


router = APIRouter(prefix="/superadmin", tags=["superadmin"])

# Sécurité via Bearer Token
security = HTTPBearer()

def get_current_superadmin(credentials: HTTPAuthorizationCredentials = Security(security), session: Session = Depends(get_cloud_session)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        is_super: bool = payload.get("is_superadmin", False)
        if username is None or not is_super:
            raise HTTPException(status_code=401, detail="Token SuperAdmin invalide")
        
        admin = session.exec(select(SuperAdmin).where(SuperAdmin.username == username)).first()
        if admin is None:
            raise HTTPException(status_code=401, detail="SuperAdmin non trouvé sur le Cloud")
        return admin
    except JWTError:
        raise HTTPException(status_code=401, detail="Session SuperAdmin expirée ou invalide")

class LoginRequest(BaseModel):
    username: str
    password: str

class ActivationRequest(BaseModel):
    duration_days: int
    max_devices: int
    rating_prompt_enabled: Optional[bool] = False
    rating_prompt_interval: Optional[str] = "monthly"
    utc_offset: Optional[int] = 1

class BroadcastMessageRequest(BaseModel):
    company_id: Optional[int] = None # None = All
    title: str
    content: str
    image_base64: Optional[str] = None



@router.post("/login")
def login_superadmin(req: LoginRequest, session: Session = Depends(get_cloud_session)):
    admin = session.exec(select(SuperAdmin).where(SuperAdmin.username == req.username)).first()
    if not admin or not verify_password(req.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Identifiants techniques incorrects")
    
    # Augmentation de la durée à 24h
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin.username, "is_superadmin": True},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": { "username": admin.username, "full_name": admin.full_name }
    }

@router.get("/clients/")
def list_clients(session: Session = Depends(get_cloud_session), admin: SuperAdmin = Depends(get_current_superadmin)):
    companies = session.exec(select(Company)).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "phone": c.phone,
            "created_at": c.created_at,
            "license_status": c.license_status,
            "license_expiry": c.license_expiry,
            "max_devices": c.max_devices,
            "rating": c.rating,
            "rating_prompt_enabled": c.rating_prompt_enabled,
            "rating_prompt_interval": c.rating_prompt_interval,
            "last_rating_prompt_date": c.last_rating_prompt_date,
            "utc_offset": c.utc_offset,
        }
        for c in companies
    ]

@router.post("/clients/{company_id}/activate")
def activate_client(company_id: int, req: ActivationRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_cloud_session), admin: SuperAdmin = Depends(get_current_superadmin)):
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    company.license_status = "active"
    company.max_devices = req.max_devices
    company.license_expiry = datetime.utcnow() + timedelta(days=req.duration_days)
    
    # Configuration Satisfaction
    if req.rating_prompt_enabled is not None:
        company.rating_prompt_enabled = req.rating_prompt_enabled
    if req.rating_prompt_interval:
        company.rating_prompt_interval = req.rating_prompt_interval
    
    if req.utc_offset is not None:
        company.utc_offset = req.utc_offset
    
    session.add(company)
    session.commit()
    session.refresh(company)

    # Notification temps réel via BackgroundTasks (évite Runtime Error)
    from services.websocket import manager
    background_tasks.add_task(manager.broadcast, {
        "type": "LICENSE_UPDATED",
        "company_id": company.id,
        "status": company.license_status
    })

    return {"message": "Licence activée", "status": company.license_status, "expiry": company.license_expiry}

@router.post("/clients/{company_id}/block")
def block_client(company_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_cloud_session), admin: SuperAdmin = Depends(get_current_superadmin)):
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    company.license_status = "locked"
    session.add(company)
    session.commit()
    session.refresh(company)

    # Notification temps réel via BackgroundTasks
    from services.websocket import manager
    background_tasks.add_task(manager.broadcast, {
        "type": "LICENSE_UPDATED",
        "company_id": company.id,
        "status": company.license_status
    })

    return {"message": "Licence bloquée", "status": company.license_status}

# --- COMMUNICATION & BROADCAST ---

@router.post("/broadcast/satisfaction")
def trigger_satisfaction(background_tasks: BackgroundTasks, company_id: Optional[int] = None, session: Session = Depends(get_cloud_session), admin: SuperAdmin = Depends(get_current_superadmin)):
    """Déclenche manuellement une demande de satisfaction (individuel ou général)."""
    from services.websocket import manager
    
    if company_id:
        company = session.get(Company, company_id)
        if company:
            company.rating_prompt_triggered = True
            session.add(company)
    else:
        # Pour tous les clients
        companies = session.exec(select(Company)).all()
        for company in companies:
            company.rating_prompt_triggered = True
            session.add(company)
            
    session.commit()
    
    # Notifier via WS
    background_tasks.add_task(manager.broadcast, {
        "type": "SATISFACTION_PROMPT",
        "company_id": company_id # None if general
    })
    
    return {"message": "Demande de satisfaction envoyée"}

@router.post("/broadcast/message")
def send_system_message(req: BroadcastMessageRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_cloud_session), admin: SuperAdmin = Depends(get_current_superadmin)):
    """Envoie un message système avec texte et image optionnelle."""
    from services.websocket import manager
    
    image_url = None
    if req.image_base64:
        image_url = process_and_save_image(req.image_base64, folder="messages")
        
    new_msg = SystemMessage(
        company_id=req.company_id,
        title=req.title,
        content=req.content,
        image_url=image_url
    )
    session.add(new_msg)
    session.commit()
    session.refresh(new_msg)
    
    # Notifier via WS
    background_tasks.add_task(manager.broadcast, {
        "type": "SYSTEM_MESSAGE",
        "company_id": req.company_id,
        "msg_id": new_msg.id
    })
    
    return new_msg

@router.get("/broadcast/messages", response_model=List[SystemMessage])
def list_system_messages(session: Session = Depends(get_cloud_session), admin: SuperAdmin = Depends(get_current_superadmin)):
    """Récupère l'historique des messages envoyés."""
    return session.exec(select(SystemMessage).order_by(SystemMessage.created_at.desc())).all()

@router.delete("/broadcast/message/{msg_id}")
def delete_system_message(msg_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_cloud_session), admin: SuperAdmin = Depends(get_current_superadmin)):
    """Supprime un message et notifie les clients en temps réel."""
    from services.websocket import manager
    msg = session.get(SystemMessage, msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    company_id = msg.company_id
    
    session.delete(msg)
    session.commit()

    # Notifier les clients via WS pour qu'ils retirent le message de l'affichage
    background_tasks.add_task(manager.broadcast, {
        "type": "DELETE_SYSTEM_MESSAGE",
        "company_id": company_id,
        "msg_id": msg_id
    })
    
    return {"message": "Message supprimé"}


# --- TECHNICAL NOTIFICATIONS ---

@router.get("/notifications", response_model=List[TechnicalNotification])
def list_notifications(session: Session = Depends(get_cloud_session), admin: SuperAdmin = Depends(get_current_superadmin)):
    """Liste les notifications techniques, les plus récentes d'abord."""
    return session.exec(select(TechnicalNotification).order_by(TechnicalNotification.created_at.desc()).limit(50)).all()

@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, session: Session = Depends(get_cloud_session), admin: SuperAdmin = Depends(get_current_superadmin)):
    """Marque une notification comme lue."""
    notif = session.get(TechnicalNotification, notif_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    notif.is_read = True
    session.add(notif)
    session.commit()
    return {"message": "Notification marquée comme lue"}

@router.delete("/notifications/{notif_id}")
def delete_notification(notif_id: int, session: Session = Depends(get_cloud_session), admin: SuperAdmin = Depends(get_current_superadmin)):
    """Supprime une notification."""
    notif = session.get(TechnicalNotification, notif_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    session.delete(notif)
    session.commit()
    return {"message": "Notification supprimée"}


# Initialiseur de compte technique par défaut (Local et Cloud)
def init_superadmin():
    # 1. Local
    with Session(engine) as session:
        existing = session.exec(select(SuperAdmin)).first()
        if not existing:
            admin = SuperAdmin(
                username="admin_tech",
                password_hash=get_password_hash("gas_super_2024"),
                full_name="Equipe Technique GAS"
            )
            session.add(admin)
            session.commit()
            print("--- COMPTE SUPERADMIN LOCAL INITIALISÉ ---")

    # 2. Cloud (Neon)
    if cloud_engine:
        try:
            with Session(cloud_engine) as session:
                existing = session.exec(select(SuperAdmin).where(SuperAdmin.username == "admin_tech")).first()
                if not existing:
                    admin = SuperAdmin(
                        username="admin_tech",
                        password_hash=get_password_hash("gas_super_2024"),
                        full_name="Equipe Technique GAS"
                    )
                    session.add(admin)
                    session.commit()
                    print("--- COMPTE SUPERADMIN CLOUD INITIALISÉ SUR NEON ---")
        except Exception as e:
            print(f"--- ERREUR INITIALISATION CLOUD ADMIN : {e} ---")
