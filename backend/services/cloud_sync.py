import asyncio
import logging
from datetime import datetime
from sqlmodel import Session, select, SQLModel
from database.db import cloud_engine, engine
from database.models import (
    Company, SystemMessage, TechnicalNotification, User, Sale, SaleItem, 
    Product, Category, Supplier, InventoryLog, Ticket, Expense, Budget, 
    RolePermission, DiningSession, RestaurantTable, SuperAdmin, ReportHistory
)

from sqlalchemy.exc import SQLAlchemyError

# Configuration du logging pour la synchronisation
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CloudSync")

ID_OFFSET = 10_000_000 # Offre support pour ~200 entreprises avec 10M d'enregistrements chacune


def get_cloud_id(local_id: int, company_id: int) -> int:
    """Génère un ID unique global pour Neon basé sur l'ID local et celui de l'entreprise."""
    if local_id is None: return None
    return (company_id * ID_OFFSET) + local_id

def is_online():

    """Vérifie si la connexion à Neon est possible."""
    import socket
    try:
        # On extrait l'hôte de l'URL Neon (ex: ep-cool-water-12345.us-east-2.aws.neon.tech)
        from urllib.parse import urlparse
        import os
        url = os.getenv("CLOUD_DATABASE_URL")
        if not url: return False
        hostname = urlparse(url).hostname
        # On tente une connexion sur le port PG (5432)
        socket.create_connection((hostname, 5432), timeout=3)
        return True
    except:
        return False

async def sync_loop():
    """Boucle de synchronisation intelligente."""
    if not cloud_engine:
        logger.warning("Pas de moteur Cloud configuré.")
        return

    logger.info("Service de synchronisation active.")
    
    # Création initiale des tables sur le Cloud
    try:
        if is_online():
            SQLModel.metadata.create_all(cloud_engine)
            logger.info("Tables Cloud prêtes.")
    except Exception as e:
        logger.error(f"Erreur initialisation Cloud : {e}")

    while True:
        if is_online():
            try:
                await perform_sync()
            except Exception as e:
                logger.error(f"Erreur lors du cycle de sync : {e}")
        else:
            logger.warning("Connexion perdue. En attente du retour d'internet...")
        
        # Attendre avant le prochain cycle (Réduit à 2 min pour être plus réactif en mode auto-migration)
        await asyncio.sleep(120)

def sync_table(local_rows, model_class, cloud_session, company_id, fk_fields=None):
    """Synchronise par blocs (Bulk) pour une vitesse maximale."""
    if not local_rows: return 0
    
    # Liste des IDs cloud correspondants
    local_id_to_cloud_id = {row.id: get_cloud_id(row.id, company_id) for row in local_rows}
    cloud_ids = list(local_id_to_cloud_id.values())
    
    # Trouver ceux qui existent déjà (pour éviter les doublons un par un)
    existing_cloud_ids = set()
    try:
        from sqlalchemy import inspect
        pk_name = inspect(model_class).primary_key[0].name
        
        # On vérifie par lots de 500 pour ne pas saturer SQL
        for i in range(0, len(cloud_ids), 500):
            batch = cloud_ids[i:i+500]
            stmt = select(model_class.id).where(model_class.id.in_(batch))
            results = cloud_session.exec(stmt).all()
            existing_cloud_ids.update(results)
    except Exception as e:
        logger.warning(f"Impossible de pré-vérifier les IDs pour {model_class.__name__}: {e}")

    to_add = []
    for row in local_rows:
        c_id = local_id_to_cloud_id[row.id]
        if c_id not in existing_cloud_ids:
            try:
                data = row.model_dump()
                data['id'] = c_id
                if 'company_id' in data: data['company_id'] = company_id
                
                if fk_fields:
                    for field in fk_fields:
                        if data.get(field):
                            data[field] = get_cloud_id(data[field], company_id)
                
                to_add.append(model_class(**data))
            except Exception as e:
                logger.error(f"Erreur préparation {model_class.__name__} {row.id}: {e}")

    if to_add:
        # Ajout massif
        cloud_session.add_all(to_add)
        logger.info(f"Injectés {len(to_add)} nouveaux enregistrements dans {model_class.__name__}")
    
    return len(to_add)


async def perform_sync():
    """Effectue une passe de synchronisation totale."""
    logger.info(f"Synchronisation totale en cours... ({datetime.now().isoformat()})")
    
    with Session(engine) as local_session:
        local_companies = local_session.exec(select(Company)).all()
        
        with Session(cloud_engine) as cloud_session:
            # 0. Sync SuperAdmins (Global)
            superadmins = local_session.exec(select(SuperAdmin)).all()
            for sa in superadmins:
                if not cloud_session.get(SuperAdmin, sa.id):
                    cloud_session.add(SuperAdmin(**sa.model_dump()))
            cloud_session.flush()

            for company in local_companies:

                try:
                    # 1. Sync Company (Synchronisation Bidirectionnelle)
                    cloud_company_stmt = select(Company).where(
                        (Company.id == company.id) | (Company.name == company.name)
                    )
                    cloud_company = cloud_session.exec(cloud_company_stmt).first()

                    should_push_massive = False
                    now = datetime.utcnow()

                    if cloud_company:
                        # PUSH : Local -> Cloud (Champs identité)
                        for field in ["name", "type", "address", "phone", "email"]:
                            setattr(cloud_company, field, getattr(company, field))
                        
                        # PULL : Cloud -> Local (Champs configuration & licence)
                        for field in ["license_status", "license_expiry", "max_devices", "currency", "tax_rate", "utc_offset", "rating_prompt_enabled", "rating_prompt_interval", "rating_prompt_triggered"]:
                            if getattr(company, field) != getattr(cloud_company, field):
                                setattr(company, field, getattr(cloud_company, field))
                        
                        # Vérification de la période de 30 jours pour le PUSH massif
                        last_push = company.last_cloud_push
                        if not last_push or (now - last_push).days >= 30:
                            should_push_massive = True
                            company.last_cloud_push = now
                        
                        local_session.add(company)
                        cloud_session.add(cloud_company)
                    else:
                        logger.info(f"Synchronisation initiale de l'entreprise : {company.name}")
                        cloud_copy = Company(**company.model_dump())
                        cloud_session.add(cloud_copy)
                        should_push_massive = True
                        company.last_cloud_push = now
                    
                    cloud_session.flush()

                    # -- Communication (Pull Cloud -> Local) --
                    # Récupération des messages actifs depuis le Cloud
                    cid = company.id
                    msg_stmt = select(SystemMessage).where(
                        (SystemMessage.company_id == cid) | (SystemMessage.company_id == None),
                        SystemMessage.is_active == True
                    )
                    cloud_msgs = cloud_session.exec(msg_stmt).all()
                    cloud_msg_ids = {m.id for m in cloud_msgs}

                    # Gestion des Suppressions (Local -> Cloud)
                    # Si un message est local mais absent du Cloud, on le supprime
                    local_msgs = local_session.exec(select(SystemMessage).where(
                        (SystemMessage.company_id == cid) | (SystemMessage.company_id == None)
                    )).all()
                    
                    for l_msg in local_msgs:
                        if l_msg.id and l_msg.id not in cloud_msg_ids:
                             # Le message a été supprimé sur le Cloud
                             logger.info(f"Suppression locale du message {l_msg.id} (absent du Cloud)")
                             local_session.delete(l_msg)
                    
                    # Mise à jour/Ajout des messages existants sur le Cloud
                    for c_msg in cloud_msgs:
                        local_msg = local_session.get(SystemMessage, c_msg.id)
                        if not local_msg:
                            local_session.add(SystemMessage(**c_msg.model_dump()))
                        else:
                            for field in ["title", "content", "is_active", "image_url"]:
                                setattr(local_msg, field, getattr(c_msg, field))
                    
                    if not should_push_massive:
                        logger.info(f"Pas de migration massive pour {company.name} (dernière migration il y a < 30j)")
                        local_session.commit()
                        cloud_session.commit()
                        continue
                    
                    logger.info(f"🚀 DÉBUT MIGRATION MASSIVE (Cycle 30j) pour {company.name}")
                    
                    # 2. Sync Tables Ordonnées avec Flush entre chaque (PUSH)
                    # -- Configuration --
                    sync_table(local_session.exec(select(User).where(User.company_id == cid)).all(), User, cloud_session, cid)
                    cloud_session.flush()
                    
                    sync_table(local_session.exec(select(Category).where(Category.company_id == cid)).all(), Category, cloud_session, cid, fk_fields=['parent_id'])
                    sync_table(local_session.exec(select(Supplier).where(Supplier.company_id == cid)).all(), Supplier, cloud_session, cid)
                    cloud_session.flush()
                    
                    # -- Catalogue --
                    sync_table(local_session.exec(select(Product).where(Product.company_id == cid)).all(), Product, cloud_session, cid, fk_fields=['category_id', 'supplier_id'])
                    cloud_session.flush()
                    
                    # -- Restaurant --
                    sync_table(local_session.exec(select(RestaurantTable).where(RestaurantTable.company_id == cid)).all(), RestaurantTable, cloud_session, cid)
                    sync_table(local_session.exec(select(DiningSession).where(DiningSession.company_id == cid)).all(), DiningSession, cloud_session, cid)
                    cloud_session.flush()
                    
                    # -- Ventes --
                    sync_table(local_session.exec(select(Sale).where(Sale.company_id == cid)).all(), Sale, cloud_session, cid, fk_fields=['user_id', 'session_id'])
                    cloud_session.flush()
                    
                    sync_table(local_session.exec(select(SaleItem).join(Sale).where(Sale.company_id == cid)).all(), SaleItem, cloud_session, cid, fk_fields=['sale_id', 'product_id'])
                    sync_table(local_session.exec(select(Ticket).where(Ticket.company_id == cid)).all(), Ticket, cloud_session, cid, fk_fields=['sale_id'])
                    cloud_session.flush()
                    
                    # -- Stock & Divers --
                    sync_table(local_session.exec(select(InventoryLog).join(Product).where(Product.company_id == cid)).all(), InventoryLog, cloud_session, cid, fk_fields=['product_id', 'user_id'])
                    sync_table(local_session.exec(select(Expense).where(Expense.company_id == cid)).all(), Expense, cloud_session, cid)
                    sync_table(local_session.exec(select(Budget).where(Budget.company_id == cid)).all(), Budget, cloud_session, cid)
                    sync_table(local_session.exec(select(RolePermission).where(RolePermission.company_id == cid)).all(), RolePermission, cloud_session, cid)
                    sync_table(local_session.exec(select(ReportHistory).where(ReportHistory.company_id == cid)).all(), ReportHistory, cloud_session, cid)
                    cloud_session.flush()

                    # -- Communication (Push local -> Cloud) --
                    # On envoie les messages système et notifs techniques locales
                    sync_table(local_session.exec(select(SystemMessage).where(SystemMessage.company_id == cid)).all(), SystemMessage, cloud_session, cid)
                    sync_table(local_session.exec(select(TechnicalNotification).where(TechnicalNotification.company_id == cid)).all(), TechnicalNotification, cloud_session, cid)

                    # -- Communication (Pull Cloud -> Local) --
                    msg_stmt = select(SystemMessage).where(
                        (SystemMessage.company_id == cid) | (SystemMessage.company_id == None),
                        SystemMessage.is_active == True
                    )
                    cloud_msgs = cloud_session.exec(msg_stmt).all()
                    for c_msg in cloud_msgs:
                        if not local_session.get(SystemMessage, c_msg.id):
                            local_session.add(SystemMessage(**c_msg.model_dump()))
                    
                    # -- Rapport de Vérification d'Intégrité --
                    from sqlalchemy import func
                    print(f"\n[CLOUD SYNC] --- RAPPORT D'INTEGRITE : {company.name} ---")
                    
                    tables_to_check = [
                        (User, "Utilisateurs"), (Category, "Categories"), (Supplier, "Fournisseurs"),
                        (Product, "Produits"), (Sale, "Ventes"), (SaleItem, "Details Ventes"),
                        (Ticket, "Tickets"), (InventoryLog, "Logs Stock"), (Expense, "Depenses"),
                        (Budget, "Budgets"), (RolePermission, "Permissions")
                    ]
                    
                    for model, label in tables_to_check:
                        try:
                            # Compte local (Optimisé avec func.count)
                            if model == InventoryLog:
                                l_total = local_session.exec(select(func.count()).select_from(model).join(Product).where(Product.company_id == cid)).one()
                            elif model == SaleItem:
                                l_total = local_session.exec(select(func.count()).select_from(model).join(Sale).where(Sale.company_id == cid)).one()
                            else:
                                l_total = local_session.exec(select(func.count(model.id)).where(model.company_id == cid)).one()
                            
                            # Compte Cloud
                            min_id = get_cloud_id(0, cid)
                            max_id = get_cloud_id(ID_OFFSET - 1, cid)
                            c_total = cloud_session.exec(select(func.count(model.id)).where(model.id > min_id, model.id <= max_id)).one()
                            
                            status = "OK" if l_total == c_total else f"MANQUANT ({l_total - c_total})"
                            icon = "[OK]" if l_total == c_total else "[!!]"
                            
                            print(f"{icon} {label:15} | Local: {l_total:4} | Cloud: {c_total:4} | Statut: {status}")
                        except Exception as ve:
                            print(f"(!) Erreur verification {label}: {ve}")


                    # Validation finale pour cette entreprise
                    local_session.commit()
                    cloud_session.commit()
                    print(f"[CLOUD SYNC] --- FIN DU RAPPORT POUR {company.name} ---\n")

                    # Notification temps réel de l'interface locale
                    try:
                        from services.websocket import manager
                        import asyncio
                        loop = asyncio.get_running_loop()
                        loop.call_soon_threadsafe(lambda: asyncio.create_task(manager.broadcast("refresh")))
                    except Exception:
                        pass



                except Exception as e:
                    import traceback
                    logger.error(f"❌ ERREUR BLOQUANTE pour {company.name}: {e}")
                    logger.error(traceback.format_exc()) # Affiche l'erreur complète pour débugger
                    local_session.rollback()
                    cloud_session.rollback()
                    continue



async def push_registration_to_cloud(company: Company):
    """Fonction appelée lors de l'enregistrement d'un nouveau compte."""
    if not cloud_engine: return
    try:
        with Session(cloud_engine) as session:
            if not session.get(Company, company.id):
                cloud_copy = Company(**company.model_dump())
                session.add(cloud_copy)
                session.add(TechnicalNotification(
                    type="NEW_CLIENT",
                    title="Nouvelle Inscription",
                    content=f"Client '{company.name}' attend sa validation.",
                    company_id=company.id
                ))
                session.commit()
    except Exception as e:
        logger.error(f"Erreur lors du push registration: {e}")
