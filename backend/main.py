from langchain_core.messages import HumanMessage
from agents.workflow import app_agent, UNAVAILABLE_MSG
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io

# Importa passlib para generar el hash de la contraseña si fuera necesario
from passlib.context import CryptContext

import models, schemas, security
from database import engine, get_db, SessionLocal

from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str

# Crear las tablas en PostgreSQL (users e invoices) si no existen
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PluriOne FinTech API")

# Permitir peticiones desde el frontend en React (http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def crear_usuario_admin_por_defecto(db: Session):
    """Verifica si existe el administrador por defecto y lo crea si no está presente."""
    admin_email = "admin@plurione.com"
    existing_admin = db.query(models.User).filter(models.User.email == admin_email).first()
    
    if not existing_admin:
        hashed_password = pwd_context.hash("PluriOne2026*")
        default_admin = models.User(
            full_name="Administrador PluriOne",
            email=admin_email,
            hashed_password=hashed_password,
            role="admin",
            is_active=True
        )
        db.add(default_admin)
        db.commit()
        print(">>> Usuario administrador de prueba creado exitosamente (admin@plurione.com / PluriOne2026*)")

# Ejecutamos la creación del usuario por defecto usando una sesión temporal de BD
db_initializer = SessionLocal()
try:
    crear_usuario_admin_por_defecto(db_initializer)
finally:
    db_initializer.close()


# --- DEPENDENCIAS DE AUTENTICACIÓN Y ROLES ---

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Decodifica el token JWT y obtiene el usuario autenticado actual."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    email = security.verify_access_token(token, credentials_exception)
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def get_admin_user(current_user: models.User = Depends(get_current_user)):
    """Valida que el usuario autenticado tenga rol de Administrador."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: Se requieren privilegios de Administrador"
        )
    return current_user


@app.get("/")
def root():
    return {"message": "API de PluriOne FinTech activa y conectada a PostgreSQL"}

# --- ENDPOINTS DE AUTENTICACIÓN Y USUARIOS ---

@app.post("/api/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
    
    hashed_pwd = security.hash_password(user.password)
    
    # ASIGNACIÓN DE ROL SEGURA EN EL BACKEND:
    assigned_role = "analyst" 
    
    new_user = models.User(
        full_name=user.full_name,
        email=user.email,
        hashed_password=hashed_pwd,
        role=assigned_role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not db_user or not security.verify_password(user_credentials.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    
    access_token = security.create_access_token({"sub": db_user.email, "role": db_user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@app.get("/api/users", response_model=List[schemas.UserResponse])
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    """Obtiene la lista de usuarios. Protegido: Solo accesible por Administradores."""
    return db.query(models.User).all()

@app.delete("/api/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    """Elimina un usuario por ID. Protegido: Solo accesible por Administradores."""
    user_to_delete = db.query(models.User).filter(models.User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(user_to_delete)
    db.commit()
    return {"message": f"Usuario con ID {user_id} eliminado exitosamente"}

# --- ENDPOINT PARA OBTENER FACTURAS Y RESUMEN (DINÁMICO) ---

@app.get("/api/invoices")
def get_invoices_and_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Obtiene la lista de facturas y los montos calculados desde la base de datos."""
    invoices = db.query(models.Invoice).all()
    
    # Si la tabla está vacía, insertamos las facturas iniciales por defecto
    if not invoices:
        default_invoices = [
            models.Invoice(folio="FAC-1021", client="Tech Solutions Ltd", amount=45000.0, status="Pendiente"),
            models.Invoice(folio="FAC-1022", client="Innovación Digital SA", amount=12500.0, status="Pendiente"),
            models.Invoice(folio="FAC-1023", client="Consultoría Global", amount=98000.0, status="Pendiente"),
        ]
        db.add_all(default_invoices)
        db.commit()
        invoices = db.query(models.Invoice).all()

    conciliated_total = sum(float(inv.amount) for inv in invoices if inv.status == "Conciliado")
    pending_risk_total = sum(float(inv.amount) for inv in invoices if inv.status != "Conciliado")

    results = [{
        "folio": inv.folio,
        "client": inv.client,
        "amount": inv.amount,
        "status": inv.status
    } for inv in invoices]

    return {
        "summary": {
            "conciliated_amount": conciliated_total,
            "risk_amount": pending_risk_total
        },
        "invoices": results
    }

# --- ENDPOINT DE CONCILIACIÓN BANCARIA (PROTEGIDO) ---

@app.post("/api/reconcile")
async def reconcile_statement(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    invoices = db.query(models.Invoice).all()
    
    if not invoices:
        default_invoices = [
            models.Invoice(folio="FAC-1021", client="Tech Solutions Ltd", amount=45000.0, status="Pendiente"),
            models.Invoice(folio="FAC-1022", client="Innovación Digital SA", amount=12500.0, status="Pendiente"),
            models.Invoice(folio="FAC-1023", client="Consultoría Global", amount=98000.0, status="Pendiente"),
        ]
        db.add_all(default_invoices)
        db.commit()
        invoices = db.query(models.Invoice).all()

    contents = await file.read()
    try:
        filename = (file.filename or "").lower()
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(('.xlsx', '.xls')):
            try:
                df = pd.read_excel(io.BytesIO(contents))
            except Exception as excel_err:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error al leer Excel. Asegúrate de tener instaladas las dependencias (ejecuta: pip install openpyxl xlrd). Detalle: {str(excel_err)}"
                )
        elif filename.endswith('.pdf'):
            try:
                import re
                from pypdf import PdfReader

                reader = PdfReader(io.BytesIO(contents))
                text = "\n".join((page.extract_text() or "") for page in reader.pages)
                matches = re.findall(r'\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b', text)
                amounts = [float(m.replace(',', '')) for m in matches if float(m.replace(',', '')) > 0]
                if not amounts:
                    raise HTTPException(status_code=400, detail="No se detectaron montos legibles en el PDF.")
                df = pd.DataFrame({'abono': amounts})
            except HTTPException:
                raise
            except Exception as pdf_err:
                raise HTTPException(
                    status_code=400,
                    detail=f"No se pudo procesar el PDF (instala 'pypdf' o sube un archivo CSV/Excel). Detalle: {str(pdf_err)}"
                )
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado. Sube un archivo CSV, Excel (.xlsx, .xls) o PDF.")
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar el archivo: {str(e)}")

    df.columns = [str(col).strip().lower() for col in df.columns]

    abono_col = None
    for col_name in ['abono', 'monto', 'importe', 'deposito']:
        if col_name in df.columns:
            abono_col = col_name
            break

    desc_col = next(
        (c for c in ['concepto', 'descripcion', 'descripción', 'referencia', 'detalle', 'folio', 'observaciones'] if c in df.columns),
        None
    )

    movimientos = []
    if abono_col is not None:
        for _, row in df.iterrows():
            val = row[abono_col]
            if pd.notnull(val):
                try:
                    monto_val = float(str(val).replace('$', '').replace(',', '').strip())
                except ValueError:
                    continue
                if monto_val > 0:
                    detalle_texto = str(row[desc_col]).strip() if desc_col and pd.notnull(row[desc_col]) else ""
                    movimientos.append({
                        "amount": monto_val,
                        "detail": detalle_texto
                    })

    conciliated_total = 0.0
    pending_risk_total = 0.0
    results = []
    matched_indices = set()

    for inv in invoices:
        inv_amount = float(inv.amount)
        folio_lower = str(inv.folio).strip().lower()

        matched_idx = None
        for idx, mov in enumerate(movimientos):
            if idx in matched_indices:
                continue
            detail_lower = mov["detail"].lower()
            es_parcial = "parcial" in detail_lower
            tiene_otro_folio = ("fac-" in detail_lower) and (folio_lower not in detail_lower)

            if not es_parcial and not tiene_otro_folio and abs(inv_amount - mov["amount"]) < 1.0:
                matched_idx = idx
                break

        if matched_idx is not None:
            matched_indices.add(matched_idx)
            inv.status = "Conciliado"
            conciliated_total += inv_amount
        else:
            inv.status = "Pendiente"
            pending_risk_total += inv_amount

        results.append({
            "folio": inv.folio,
            "client": inv.client,
            "amount": inv.amount,
            "status": inv.status
        })

    unmatched_abonos = []
    unmatched_details = []
    for idx, mov in enumerate(movimientos):
        if idx not in matched_indices:
            unmatched_abonos.append(mov["amount"])
            unmatched_details.append({
                "amount": mov["amount"],
                "detail": mov["detail"] or "Movimiento / depósito sin identificar o parcial"
            })

    db.commit()

    return {
        "summary": {
            "conciliated_amount": conciliated_total,
            "risk_amount": pending_risk_total,
            "unmatched_abonos": unmatched_abonos,
            "unmatched_details": unmatched_details
        },
        "invoices": results
    }

# --- ENDPOINT DEL AGENTE INTELIGENTE (CON RESPALDO INTELIGENTE) ---

@app.post("/api/chat")
def chat_with_agent(
    request: ChatRequest,
    current_user: models.User = Depends(get_current_user),
):
    user_message = (request.message or "").strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")

    try:
        result = app_agent.invoke({"messages": [HumanMessage(content=user_message)]})
        messages = result.get("messages", [])
        reply = messages[-1].content if messages else UNAVAILABLE_MSG
        return {"response": reply}
    except Exception:
        return {"response": UNAVAILABLE_MSG}