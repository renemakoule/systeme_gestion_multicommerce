import traceback
import logging

from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Request, File, UploadFile, BackgroundTasks
from fastapi.staticfiles import StaticFiles
import os
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
import uvicorn
import random
import asyncio
from typing import List
from datetime import timedelta
from contextlib import asynccontextmanager

from database.db import engine, create_db_and_tables, get_session
from database.models import Company, User, Sale, Expense, Product, InventoryLog, Category, Supplier, Budget, DiningSession, TechnicalNotification, SystemMessage
from services.auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

from routers import products, sales, users, stats, expenses, reports, suppliers, budgets, forecasts, restaurant
from routers import company as company_router, roles, superadmin
from services.websocket import manager
from services.cloud_sync import sync_loop, push_registration_to_cloud


# manager est maintenant importé de services/websocket.py

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialisation de la DB au démarrage
    create_db_and_tables()
    
    # Initialiser le compte technique par défaut
    from routers.superadmin import init_superadmin
    init_superadmin()
    
    # Enregistrer les hooks de DB pour le rafraîchissement temps réel
    from sqlalchemy import event
    
    loop = asyncio.get_running_loop()
    
    def trigger_refresh(*args, **kwargs):
        # Utiliser call_soon_threadsafe pour brigder le sync SQLALchemy vers l'async WebSocket
        loop.call_soon_threadsafe(lambda: asyncio.create_task(manager.broadcast("refresh")))

    # On écoute les modifications sur tous les modèles vitaux
    models_to_watch = [Sale, Expense, Product, InventoryLog, Category, Supplier, Budget, Company, SystemMessage]
    for model in models_to_watch:
        event.listen(model, "after_insert", trigger_refresh)
        event.listen(model, "after_update", trigger_refresh)
        event.listen(model, "after_delete", trigger_refresh)
        
    # Démarrer la synchronisation Cloud en tâche de fond
    asyncio.create_task(sync_loop())
    logger_sync = logging.getLogger("CloudSync")
    logger_sync.info("Tâche de synchronisation planifiée.")
    
    yield


app = FastAPI(title="Système de Gestion Market API", lifespan=lifespan)
print("--- BACKEND RELOADED : VERSION V2 (Analyses) ---")

# --- WEBSOCKET ENDPOINT ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # On attend juste que le client reste connecté
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# Configuration CORS pour permettre au frontend (Next.js/Electron) de communiquer
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION DES CHEMINS STATIQUES ---
# On calcule le chemin absolu vers le dossier static dans backend/
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BACKEND_DIR, "static")

# Créer les dossiers de stockage si nécessaires
os.makedirs(os.path.join(STATIC_DIR, "uploads", "logos"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "uploads", "products"), exist_ok=True)

# Intercepter les logos introuvables pour éviter le spam 404 (renvoie une image 1x1 transparente)
@app.get("/static/uploads/logos/{filename}")
async def get_logo(filename: str):
    path = os.path.join(STATIC_DIR, "uploads", "logos", filename)
    if os.path.exists(path):
        return FileResponse(path)
    # Image GIF transparente 1x1
    transparent_gif = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
    return Response(content=transparent_gif, media_type="image/gif", headers={"Cache-Control": "max-age=86400"})

# Servir les fichiers statiques (images, logos...) avec chemin absolu
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# --- MIDDLEWARE DE LOGGING ADAPTATIF ---
@app.middleware("http")
async def log_company_context(request: Request, call_next):
    # Tenter de récupérer le company_id des paramètres de requête
    company_id = request.query_params.get("company_id")
    
    company_info = ""
    if company_id:
        try:
            # On utilise une session temporaire pour ne pas interférer
            from database.db import engine
            from sqlmodel import Session, select
            with Session(engine) as session:
                statement = select(Company.name, Company.type).where(Company.id == int(company_id))
                res = session.exec(statement).first()
                if res:
                    c_name, c_type = res
                    # Formatting matching the user's console request
                    display_type = (c_type or "inconnu").upper()
                    company_info = f" \033[1;35m[{display_type} : {c_name}]\033[0m"
        except Exception:
            pass

    # Log avant exécution
    method = request.method
    path = request.url.path
    if not path.startswith("/static/"):
        print(f"\033[1;32mINFO\033[0m:    {request.client.host} - \"{method} {path}\"{company_info}")
    
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        print(f"\n\033[1;41m ERREUR FATALE (500) \033[0m \033[1;31m{method} {path}\033[0m")
        traceback.print_exc()
        print("\n")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(e)},
            headers={"Access-Control-Allow-Origin": "*"}
        )

# Diagnostic final
@app.get("/api-test")
def api_test():
    return {"status": "ok", "msg": "Backend is running latest code"}

# Register Routers
app.include_router(forecasts.router)
app.include_router(superadmin.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(users.router)
app.include_router(stats.router)
app.include_router(expenses.router)
app.include_router(reports.router)
app.include_router(suppliers.router)
app.include_router(budgets.router)
app.include_router(company_router.router)
app.include_router(roles.router)
app.include_router(restaurant.router)

@app.get("/status")
def get_status():
    return {"status": "online", "database": "systeme_gestion.db"}

@app.get("/debug-routes")
def debug_routes():
    return {
        "routes": [route.path for route in app.routes],
        "router_count": len(app.routes)
    }

def generate_smart_suggestions(name: str, session: Session):
    # Lexique de termes valorisants et contextuels
    suffixes = ["Plus", "Pro", "Elite", "Market", "Store", "Global", "360", "Group", "Expert", "Studio", "Connect"]
    prefixes = ["My", "The", "Best", "Top", "Fast", "Smart", "One"]
    
    suggestions = set()
    base = name.strip()
    
    # Génération d'un pool de variantes aléatoires et intelligentes
    attempts = 0
    while len(suggestions) < 3 and attempts < 20:
        pattern = random.randint(0, 4)
        if pattern == 0:
            s = f"{base} {random.choice(suffixes)}"
        elif pattern == 1:
            s = f"{base} {random.randint(10, 99)}"
        elif pattern == 2:
            s = f"{random.choice(prefixes)} {base}"
        elif pattern == 3:
            s = f"{base} {random.choice(suffixes)} {random.randint(1, 9)}"
        else:
            s = f"{random.choice(prefixes)} {base} {random.choice(suffixes)}"
            
        # On vérifie si ce nom précis ET son matricule dérivé sont libres
        slug = s.lower().replace(" ", "_")
        comp_stmt = select(Company).where(Company.name == s)
        user_stmt = select(User).where(User.username == slug)
        
        if not session.exec(comp_stmt).first() and not session.exec(user_stmt).first():
            suggestions.add(s)
        attempts += 1
        
    return list(suggestions)

# --- AUTH ROUTES ---

@app.post("/auth/register")
def register(data: dict, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    # data: { name: "Boutique X", password: "123" }
    
    # 0. Dériver le matricule AVANT toute opération
    admin_username = data["name"].lower().replace(" ", "_")
    
    # 1. Vérifier si le nom OU le matricule est déjà pris
    comp_stmt = select(Company).where(Company.name == data["name"])
    user_stmt = select(User).where(User.username == admin_username)
    
    if session.exec(comp_stmt).first() or session.exec(user_stmt).first():
        suggestions = generate_smart_suggestions(data["name"], session)
        raise HTTPException(
            status_code=400, 
            detail={"message": "Ce nom d'établissement ou l'identifiant associé est déjà utilisé", "suggestions": suggestions}
        )
    
    try:
        # 2. Créer l'entreprise
        new_company = Company(
            name=data["name"],
            license_status="pending",
            max_devices=1,
            device_uuids="[]"
        )
        session.add(new_company)
        session.flush() 
        
        # 3. Créer l'utilisateur gérant par défaut
        hashed_password = get_password_hash(data["password"])
        user = User(
            company_id=new_company.id,
            name="Administrateur",
            username=admin_username, 
            password_hash=hashed_password,
            role="gerant"
        )
        session.add(user)
        
        # 4. Commit unique et atomique (Tout ou rien)
        session.commit()
        session.refresh(new_company)
        session.refresh(user)

        # 5. Créer une notification technique (Persistance)
        notif = TechnicalNotification(
            type="NEW_CLIENT",
            title="Nouvelle Inscription",
            content=f"L'établissement '{new_company.name}' vient de créer son compte.",
            company_id=new_company.id
        )
        session.add(notif)
        session.commit()

        # 7. Push vers le Cloud pour validation technique
        background_tasks.add_task(push_registration_to_cloud, new_company)

        return {
            "message": "Compte créé avec succès", 
            "company_id": new_company.id, 
            "user_id": user.id,
            "username": admin_username
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    return {
        "message": "Compte créé avec succès", 
        "company_id": new_company.id, 
        "user_id": user.id,
        "username": admin_username
    }

@app.post("/auth/login")
def login(data: dict, session: Session = Depends(get_session)):
    # data: { establishment: "Boutique X", username: "mon_matricule", password: "123" }
    
    # Recherche de l'entreprise
    company_stmt = select(Company).where(Company.name == data["establishment"])
    db_company = session.exec(company_stmt).first()
    
    if not db_company:
        raise HTTPException(status_code=404, detail="Établissement non trouvé")
        
    # Recherche de l'utilisateur : par matricule si fourni, sinon par rôle gérant
    if data.get("username"):
        user_stmt = select(User).where(User.company_id == db_company.id, User.username == data["username"])
    else:
        user_stmt = select(User).where(User.company_id == db_company.id, User.role == "gerant")
        
    user = session.exec(user_stmt).first()
    
    # --- LOGIC DE CONNEXION CLIENT (Nouveau) ---
    if not user:
        # Si aucun utilisateur, on vérifie si le matricule correspond à une session restaurant active
        session_stmt = select(DiningSession).where(
            DiningSession.company_id == db_company.id, 
            DiningSession.access_code == data.get("username"),
            DiningSession.is_active == True
        )
        dining_session = session.exec(session_stmt).first()
        
        if dining_session:
            # On crée un token "invité" avec un rôle client
            access_token_expires = timedelta(minutes=60 * 4) # 4 heures max pour un client
            access_token = create_access_token(
                data={"sub": dining_session.access_code, "role": "client", "company_id": db_company.id},
                expires_delta=access_token_expires
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": -dining_session.id, # ID négatif pour distinguer des vrais users
                    "username": dining_session.access_code,
                    "name": dining_session.client_name or f"Client Table {dining_session.table_number}",
                    "role": "client",
                    "company_id": db_company.id,
                    "company_name": db_company.name,
                    "company_type": db_company.type,
                    "table_number": dining_session.table_number,
                    "session_id": dining_session.id
                }
            }
        
    if not user or (data.get("password") and not verify_password(data["password"], user.password_hash)):
        raise HTTPException(status_code=401, detail="Identifiants invalides")
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "company_id": user.company_id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "role": user.role,
            "company_id": user.company_id,
            "company_name": db_company.name,
            "company_type": db_company.type,
            "enabled_modules": db_company.enabled_modules
        }
    }

@app.post("/auth/onboarding")
def onboarding(data: dict, session: Session = Depends(get_session)):
    # data: { company_id: 1, type: "restaurant", modules: ["inventory", "pos"] }
    statement = select(Company).where(Company.id == data["company_id"])
    company = session.exec(statement).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        
    company.type = data["type"]
    
    # Enregistrer les modules activés
    if "modules" in data and isinstance(data["modules"], list):
        company.enabled_modules = ",".join(data["modules"])
    elif "roles" in data and isinstance(data["roles"], list):
        # Fallback pour compatibilité
        company.enabled_modules = ",".join(data["roles"])
        
    session.add(company)
    session.commit()
    
    return {"message": "Configuration terminée"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)