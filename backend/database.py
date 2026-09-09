import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(BASE_DIR, "medikiosk.db"))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_all_tables():
    Base.metadata.create_all(bind=engine)


def ensure_legacy_columns():
    """Add lightweight SQLite columns introduced after the first demo build."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    additions = {
        "conversation_sessions": [("structured_data", "TEXT")],
        "conversation_messages": [("question_state", "VARCHAR")],
        "hospitals": [("is_government", "BOOLEAN DEFAULT 1")],
        "patients": [("medical_history", "TEXT")],
        "users": [("facility_id", "VARCHAR"), ("facility_role", "VARCHAR")],
        "doctors": [("hospital_id", "VARCHAR")],
    }
    with engine.begin() as conn:
        for table, columns in additions.items():
            existing = {c["name"] for c in inspector.get_columns(table)} if table in inspector.get_table_names() else set()
            for name, sql_type in columns:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))
        # Give existing demo clinical users a sensible default facility so the
        # facility-scoped RBAC and nearby-doctor views work immediately.
        tables = set(inspector.get_table_names())
        if {"users", "hospitals"}.issubset(tables):
            conn.execute(text("UPDATE users SET facility_id=(SELECT id FROM hospitals ORDER BY name LIMIT 1) WHERE facility_id IS NULL AND role IN ('DOCTOR','STAFF')"))
        if {"doctors", "users"}.issubset(tables):
            conn.execute(text("UPDATE doctors SET hospital_id=(SELECT facility_id FROM users WHERE users.id=doctors.user_id) WHERE doctors.hospital_id IS NULL"))
