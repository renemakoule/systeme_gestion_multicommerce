from sqlmodel import SQLModel, create_engine, Session
import os
from dotenv import load_dotenv
from utils.paths import get_db_path

# Charger les variables d'environnement
load_dotenv()

# Chemin complet de la base isolé dans AppData pour la production
sqlite_url = f"sqlite:///{get_db_path()}"

# Configuration Cloud (Neon.tech)
cloud_url = os.getenv("CLOUD_DATABASE_URL")
cloud_engine = None
if cloud_url and "postgresql" in cloud_url:
    cloud_engine = create_engine(cloud_url, echo=False)

# Chargement des modèles pour s'assurer de leur création
from .models import Company, User, Product, Category, Sale, SaleItem, Supplier, InventoryLog

engine = create_engine(sqlite_url, echo=True, connect_args={"check_same_thread": False})


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

def get_cloud_session():
    """Dépendance pour obtenir une session sur Neon.tech."""
    if not cloud_engine:
        raise Exception("Moteur Cloud non configuré.")
    with Session(cloud_engine) as session:
        yield session

