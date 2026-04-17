import os
import sys

def get_base_path():
    """
    Retourne le chemin de base de l'application.
    En mode développement, c'est le dossier racine.
    En mode 'frozen' (PyInstaller), c'est le dossier de l'exécutable.
    """
    if getattr(sys, 'frozen', False):
        # Utiliser le dossier de l'exécutable pour les ressources persistantes
        return os.path.dirname(sys.executable)
    # En développement, on remonte d'un cran si on est dans backend/ utils/
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def get_app_data_path():
    """
    Retourne le dossier de stockage persistant dans AppData.
    Crée le dossier s'il n'existe pas.
    """
    app_data = os.environ.get('APPDATA')
    if not app_data:
        # Fallback pour Linux/Mac ou si APPDATA n'est pas défini
        app_data = os.path.expanduser("~/.local/share")
        
    path = os.path.join(app_data, "GASNexus")
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)
    return path

def get_db_path():
    """Retourne le chemin complet vers la base de données SQLite."""
    db_dir = os.path.join(get_app_data_path(), "database")
    os.makedirs(db_dir, exist_ok=True)
    return os.path.join(db_dir, "systeme_gestion.db")

def get_uploads_path():
    """Retourne le chemin complet vers le dossier des uploads."""
    uploads_dir = os.path.join(get_app_data_path(), "static", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    return uploads_dir

def get_logs_path():
    """Retourne le chemin vers le dossier des logs."""
    logs_dir = os.path.join(get_app_data_path(), "logs")
    os.makedirs(logs_dir, exist_ok=True)
    return logs_dir
