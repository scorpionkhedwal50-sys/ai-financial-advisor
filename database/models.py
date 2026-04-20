import logging
from database.db import get_connection

logger = logging.getLogger(__name__)


def create_tables():
    """
    Create all application tables if they don't exist, then ensure
    performance indexes are present.  Safe to call on every startup.
    """
    conn   = get_connection()
    cursor = conn.cursor()

    # ── users ──────────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            age              INTEGER NOT NULL,
            income           REAL    NOT NULL,
            expenses         REAL    NOT NULL,
            savings          REAL    NOT NULL,
            risk_appetite    TEXT    NOT NULL,
            financial_goals  TEXT    NOT NULL,
            created_at       TEXT    DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── reports ────────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER NOT NULL UNIQUE
                             REFERENCES users(id) ON DELETE CASCADE,
            health_json  TEXT    NOT NULL,
            ai_report    TEXT    NOT NULL,
            pdf_blob     BLOB    NOT NULL,
            generated_at TEXT    DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── chat_history ───────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL
                           REFERENCES users(id) ON DELETE CASCADE,
            role       TEXT NOT NULL CHECK(role IN ('user', 'ai')),
            message    TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Indexes ────────────────────────────────────────────────────────────
    # reports.user_id  — every report lookup is by user_id
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_reports_user_id
        ON reports(user_id)
    """)

    # chat_history.user_id + id (DESC) — history queries filter by user
    # then page by recency; the composite index covers both at once
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_chat_history_user_id
        ON chat_history(user_id, id DESC)
    """)

    conn.commit()
    conn.close()
    logger.info("Database tables and indexes verified / created.")