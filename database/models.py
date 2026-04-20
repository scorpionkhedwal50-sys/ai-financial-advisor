from database.db import get_connection


def create_tables():
    conn = get_connection()
    cursor = conn.cursor()

    # Enable WAL mode for better concurrent read performance
    cursor.execute("PRAGMA journal_mode=WAL")

    # ── users ──────────────────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        age              INTEGER  CHECK(age > 0 AND age < 120),
        income           REAL     CHECK(income >= 0),
        expenses         REAL     CHECK(expenses >= 0),
        savings          REAL     CHECK(savings >= 0),
        risk_appetite    TEXT     CHECK(risk_appetite IN ('low','medium','high')),
        financial_goals  TEXT,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # ── reports ────────────────────────────────────────────────────────────
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

    # ── chat_history ───────────────────────────────────────────────────────
    # Stores every message per user so the AI has conversation context
    # and the frontend doesn't need localStorage.
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        role       TEXT    NOT NULL CHECK(role IN ('user','ai')),
        message    TEXT    NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_user   ON chat_history(user_id)")

    conn.commit()
    conn.close()