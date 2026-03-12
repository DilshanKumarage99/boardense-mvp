"""
Migration: add renewal_os columns to the companies table.
Supports both SQLite (local) and PostgreSQL (Render).
Run once from the backend/ directory:
    python migrate_renewal_os.py
"""
import os

DB_URL = os.getenv(
    'DATABASE_URL',
    f'sqlite:///{os.path.join(os.path.dirname(__file__), "instance", "boardense.db")}'
)

# Normalise Render's legacy postgres:// scheme
if DB_URL.startswith('postgres://'):
    DB_URL = DB_URL.replace('postgres://', 'postgresql://', 1)

NEW_COLUMNS = [
    ('renewal_os_analysis', 'TEXT'),
    ('renewal_os_updated_at', 'TIMESTAMP'),
    ('renewal_os_doc_count', 'INTEGER DEFAULT 0'),
]


def migrate_sqlite(db_path):
    import sqlite3
    if not os.path.exists(db_path):
        print(f'SQLite database not found at {db_path}. Nothing to migrate.')
        return
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('PRAGMA table_info(companies)')
    existing = [row[1] for row in cursor.fetchall()]
    added = []
    for col_name, col_type in NEW_COLUMNS:
        if col_name not in existing:
            cursor.execute(f'ALTER TABLE companies ADD COLUMN {col_name} {col_type}')
            added.append(col_name)
        else:
            print(f'  {col_name} already exists — skipped.')
    if added:
        conn.commit()
        print(f'Migration complete (SQLite): added — {", ".join(added)}')
    else:
        print('Nothing to migrate (SQLite) — all columns already exist.')
    conn.close()


def migrate_postgres(db_url):
    import psycopg2
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'companies'
    """)
    existing = [row[0] for row in cursor.fetchall()]
    added = []
    for col_name, col_type in NEW_COLUMNS:
        if col_name not in existing:
            cursor.execute(f'ALTER TABLE companies ADD COLUMN {col_name} {col_type}')
            added.append(col_name)
        else:
            print(f'  {col_name} already exists — skipped.')
    if added:
        print(f'Migration complete (PostgreSQL): added — {", ".join(added)}')
    else:
        print('Nothing to migrate (PostgreSQL) — all columns already exist.')
    cursor.close()
    conn.close()


def migrate():
    if DB_URL.startswith('sqlite:///'):
        db_path = DB_URL.replace('sqlite:///', '', 1)
        if not os.path.isabs(db_path):
            db_path = os.path.join(os.path.dirname(__file__), db_path)
        migrate_sqlite(db_path)
    else:
        migrate_postgres(DB_URL)


if __name__ == '__main__':
    migrate()
