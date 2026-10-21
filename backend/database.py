from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Cadena de conexión con las credenciales configuradas en docker-compose.yml
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://admin_plurione:SecurePassword2026!@localhost:5432/plurione_finance_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()