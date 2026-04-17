from datetime import datetime, timedelta
from typing import Tuple
from sqlmodel import Session
from database.models import Company

def get_company_offset(session: Session, company_id: int) -> int:
    """Récupère l'offset UTC de l'entreprise (défaut: 1)."""
    company = session.get(Company, company_id)
    return company.utc_offset if company else 1

def to_local(utc_dt: datetime, offset_hours: int) -> datetime:
    """Convertit un datetime UTC en heure locale."""
    if utc_dt is None:
        return None
    return utc_dt + timedelta(hours=offset_hours)

def to_utc(local_dt: datetime, offset_hours: int) -> datetime:
    """Convertit un datetime local en heure UTC."""
    if local_dt is None:
        return None
    return local_dt - timedelta(hours=offset_hours)

def get_today_bounds(session: Session, company_id: int) -> Tuple[datetime, datetime]:
    """Retourne (start_utc, end_utc) pour aujourd'hui selon l'offset de l'entreprise."""
    offset = get_company_offset(session, company_id)
    now_utc = datetime.utcnow()
    now_local = to_local(now_utc, offset)
    
    start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = start_local + timedelta(days=1)
    
    return to_utc(start_local, offset), to_utc(end_local, offset)

def get_french_day_name(dt: datetime) -> str:
    """Retourne le nom du jour en français (Abrégé)."""
    days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
    return days[dt.weekday()]
