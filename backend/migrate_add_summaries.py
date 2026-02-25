"""
Migration: add content_summary column to documents table.
Run once from the backend/ directory:
    python migrate_add_summaries.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'boardense.db')

def migrate():
    if not os.path.exists(DB_PATH):
        print(f'Database not found at {DB_PATH}. Nothing to migrate.')
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(documents)")
    columns = [row[1] for row in cursor.fetchall()]

    if 'content_summary' not in columns:
        cursor.execute('ALTER TABLE documents ADD COLUMN content_summary TEXT')
        conn.commit()
        print('Migration complete: content_summary column added.')
    else:
        print('content_summary column already exists. Nothing to do.')

    conn.close()

if __name__ == '__main__':
    migrate()
