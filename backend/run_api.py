import uvicorn
import os
import sys

# Ajout du dossier courant au path pour les imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("--- DÉMARRAGE DU SERVEUR BACKEND (FASTAPI) ---")
    print("Version: 1.0.0")
    print("Database: systeme_gestion.db")
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
