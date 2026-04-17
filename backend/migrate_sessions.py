import sqlite3
import os

db_path = "systeme_gestion.db"

def migrate():
    print(f"--- Starting Session Migration on {db_path} ---")
    if not os.path.exists(db_path):
        print(f"Error: Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Create diningsession table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS diningsession (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL,
                table_number TEXT NOT NULL,
                access_code TEXT UNIQUE NOT NULL,
                client_name TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES company (id)
            );
        """)
        print("[OK] Table 'diningsession' created or already exists.")
    except Exception as e:
        print(f"[ERROR] Failed to create diningsession: {e}")

    # 2. Add session_id to sale table
    try:
        cursor.execute("ALTER TABLE sale ADD COLUMN session_id INTEGER;")
        print("[OK] Column 'session_id' added to 'sale'.")
    except sqlite3.OperationalError:
        print("[INFO] Column 'session_id' already exists in 'sale'.")

    conn.commit()
    conn.close()
    print("--- Session Migration completed successfully ---")

if __name__ == "__main__":
    migrate()
