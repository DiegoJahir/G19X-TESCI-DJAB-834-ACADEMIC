from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="analyst")  # admin, analyst, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String, unique=True, index=True, nullable=False)
    client = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="Pendiente")  # Pendiente, Conciliado
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))