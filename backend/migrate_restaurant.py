import sqlite3
import os

db_path = "systeme_gestion.db"

def migrate():
    print(f"--- Starting Restaurant Migration on {db_path} ---")
    if not os.path.exists(db_path):
        print(f"Error: Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Create restauranttable table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS restauranttable (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL,
                number TEXT NOT NULL,
                capacity INTEGER DEFAULT 4,
                status TEXT DEFAULT 'available',
                FOREIGN KEY (company_id) REFERENCES company (id)
            );
        """)
        print("[OK] Table 'restauranttable' created or already exists.")
    except Exception as e:
        print(f"[ERROR] Failed to create restauranttable: {e}")

    # 2. Add table_number to sale table
    try:
        cursor.execute("ALTER TABLE sale ADD COLUMN table_number TEXT;")
        print("[OK] Column 'table_number' added to 'sale'.")
    except sqlite3.OperationalError:
        print("[INFO] Column 'table_number' already exists in 'sale'.")

    # 3. Handle NULL user_id in sale (it's already allowed in SQLite if not restricted by NOT NULL)
    # checking current schema of sale
    cursor.execute("PRAGMA table_info(sale);")
    columns = cursor.fetchall()
    for col in columns:
        if col[1] == 'user_id':
             # col[3] is 'notnull' (1 if NOT NULL, 0 if it allows NULL)
             print(f"[INFO] 'user_id' notnull status: {col[3]}")
    
    conn.commit()
    conn.close()
    print("--- Restaurant Migration completed successfully ---")

if __name__ == "__main__":
    migrate()
