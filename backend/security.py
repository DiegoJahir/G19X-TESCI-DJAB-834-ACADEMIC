import os
import secrets
from pathlib import Path
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from fastapi import HTTPException

BACKEND_ENV = Path(__file__).resolve().parent / ".env"
ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"
if BACKEND_ENV.exists():
    load_dotenv(dotenv_path=BACKEND_ENV)
elif ROOT_ENV.exists():
    load_dotenv(dotenv_path=ROOT_ENV)
else:
    load_dotenv()

_env_secret = os.getenv("SECRET_KEY", "").strip()
SECRET_KEY = _env_secret if _env_secret else secrets.token_urlsafe(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # Expira en 24 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Genera el hash seguro de la contraseña usando bcrypt."""
    safe_password = password.encode("utf-8")[:72]
    return pwd_context.hash(safe_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si una contraseña en texto plano coincide con su hash."""
    safe_password = plain_password.encode("utf-8")[:72]
    return pwd_context.verify(safe_password, hashed_password)


def create_access_token(data: dict) -> str:
    """Crea un token JWT firmado digitalmente incluyendo fecha de expiración."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str, credentials_exception: HTTPException) -> str:
    """Decodifica y valida la vigencia del token JWT, retornando el email (subject)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        return email
    except jwt.PyJWTError:
        raise credentials_exception