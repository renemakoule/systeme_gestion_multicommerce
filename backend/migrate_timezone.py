import sqlite3
import os

db_path = "systeme_gestion.db"

def migrate():
    print(f"--- Starting Timezone Migration on {db_path} ---")
    if not os.path.exists(db_path):
        # Essayer de trouver le chemin dans le dossier backend
        if os.path.exists("backend/systeme_gestion.db"):
            db_path_final = "backend/systeme_gestion.db"
        elif os.path.exists("../systeme_gestion.db"):
            db_path_final = "../systeme_gestion.db"
        else:
            print(f"Error: Database {db_path} not found.")
            return
    else:
        db_path_final = db_path

    conn = sqlite3.connect(db_path_final)
    cursor = conn.cursor()

    # Ajouter utc_offset à la table company
    try:
        cursor.execute("ALTER TABLE company ADD COLUMN utc_offset INTEGER DEFAULT 1;")
        print("[OK] Column 'utc_offset' added to 'company'.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("[INFO] Column 'utc_offset' already exists in 'company'.")
        else:
            print(f"[ERROR] Failed to add column: {e}")

    conn.commit()
    conn.close()
    print("--- Timezone Migration completed successfully ---")

if __name__ == "__main__":
    migrate()
