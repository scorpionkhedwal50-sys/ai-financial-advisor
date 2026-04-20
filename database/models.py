from database.db import get_connection


def create_tables():
    conn = get_connection()
    cursor = conn.cursor()

    # ── users ──────────────────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        age              INTEGER,
        income           REAL,
        expenses         REAL,
        savings          REAL,
        risk_appetite    TEXT,
        financial_goals  TEXT,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # ── reports ────────────────────────────────────────────────────────────
    # One row per user (upserted on regenerate).
    # pdf_blob stores the raw PDF bytes so we never rely on the filesystem
    # between sessions.
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER UNIQUE NOT NULL,
        health_json  TEXT    NOT NULL,
        ai_report    TEXT    NOT NULL,
        pdf_blob     BLOB    NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    conn.commit()
    conn.close()