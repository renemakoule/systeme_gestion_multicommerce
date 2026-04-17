import sqlite3
import os

db_path = "backend/systeme_gestion.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

columns_to_add = [
    ("rating", "INTEGER DEFAULT 0"),
    ("rating_prompt_enabled", "BOOLEAN DEFAULT 0"),
    ("rating_prompt_interval", "TEXT DEFAULT 'monthly'"),
    ("last_rating_prompt_date", "DATETIME")
]

for col_name, col_type in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE company ADD COLUMN {col_name} {col_type}")
        print(f"Added column {col_name} to company table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"Column {col_name} already exists.")
        else:
            print(f"Error adding column {col_name}: {e}")

conn.commit()
conn.close()
print("Migration completed.")
