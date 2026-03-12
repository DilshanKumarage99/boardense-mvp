"""
Migration: add renewal_os columns to the companies table.
Run once from the backend/ directory:
    python migrate_renewal_os.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'boardense.db')

NEW_COLUMNS = [
    ('renewal_os_analysis', 'TEXT'),
    ('renewal_os_updated_at', 'DATETIME'),
    ('renewal_os_doc_count', 'INTEGER DEFAULT 0'),
]

def migrate():
    if not os.path.exists(DB_PATH):
        print(f'Database not found at {DB_PATH}. Nothing to migrate.')
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(companies)")
    existing_columns = [row[1] for row in cursor.fetchall()]

    added = []
    for col_name, col_type in NEW_COLUMNS:
        if col_name not in existing_columns:
            cursor.execute(f'ALTER TABLE companies ADD COLUMN {col_name} {col_type}')
            added.append(col_name)
        else:
            print(f'  Column {col_name} already exists — skipped.')

    if added:
        conn.commit()
        print(f'Migration complete: added columns — {", ".join(added)}')
    else:
        print('Nothing to migrate — all columns already exist.')

    conn.close()

if __name__ == '__main__':
    migrate()
