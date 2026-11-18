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

# Justo después de: models.Base.metadata.create_all(bind=engine)
models.Base.metadata.create_all(bind=engine)

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
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            try:
                df = pd.read_excel(io.BytesIO(contents))
            except Exception as excel_err:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Error al leer Excel. Asegúrate de tener instaladas las dependencias (ejecuta: pip install openpyxl xlrd). Detalle: {str(excel_err)}"
                )
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado. Sube un archivo CSV o Excel (.xlsx, .xls).")
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar el archivo: {str(e)}")

    df.columns = [str(col).strip().lower() for col in df.columns]

    abonos = []
    if 'abono' in df.columns:
        abonos = df['abono'].dropna().tolist()
    elif 'monto' in df.columns:
        abonos = df['monto'].dropna().tolist()

    conciliated_total = 0.0
    pending_risk_total = 0.0
    results = []

    for inv in invoices:
        match_found = any(abs(float(inv.amount) - float(abono)) < 1.0 for abono in abonos if pd.notnull(abono))
        
        if match_found:
            inv.status = "Conciliado"
            conciliated_total += inv.amount
        else:
            inv.status = "Pendiente"
            pending_risk_total += inv.amount
            
        results.append({
            "folio": inv.folio,
            "client": inv.client,
            "amount": inv.amount,
            "status": inv.status
        })

    db.commit()

    return {
        "summary": {
            "conciliated_amount": conciliated_total,
            "risk_amount": pending_risk_total
        },
        "invoices": results
    }

# --- ENDPOINT DEL AGENTE INTELIGENTE (CON RESPALDO INTELIGENTE) ---

@app.post("/api/chat")
async def chat_with_agent(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user_msg = request.message.lower()
    
    try:
        # Intento 1: Ejecutar el orquestador agéntico real (LangGraph + LLM)
        from agents.workflow import app_agent
        from langchain_core.messages import HumanMessage

        initial_state = {"messages": [HumanMessage(content=request.message)]}
        output = app_agent.invoke(initial_state)
        final_message = output["messages"][-1]
        
        return {
            "status": "success",
            "response": final_message.content
        }
    except Exception as e:
        # Respaldo inteligente si no hay API Key de LLM configurada
        print(f">>> Aviso: Agente LLM no disponible ({str(e)}). Activando respaldo basado en BD...")
        
        invoices = db.query(models.Invoice).all()
        conciliated_total = sum(float(inv.amount) for inv in invoices if inv.status == "Conciliado")
        risk_total = sum(float(inv.amount) for inv in invoices if inv.status != "Conciliado")
        
        # Lógica de respuestas automáticas basadas en palabras clave y datos reales
        if "resumen" in user_msg or "estado" in user_msg or "total" in user_msg:
            resp = f"[Modo Respaldo Agéntico] Análisis financiero actual: Monto conciliado: ${conciliated_total:,.2f} MXN | Riesgo pendiente: ${risk_total:,.2f} MXN."
        elif "factura" in user_msg or "folio" in user_msg:
            detalle = ", ".join([f"{inv.folio} ({inv.client}: ${inv.amount:,.2f} - {inv.status})" for inv in invoices])
            resp = f"[Modo Respaldo Agéntico] Facturas registradas en el sistema: {detalle}."
        elif "riesgo" in user_msg:
            resp = f"[Modo Respaldo Agéntico] El monto total en riesgo por facturas pendientes es de ${risk_total:,.2f} MXN."
        else:
            resp = f"[Modo Demostración IA] He recibido tu instrucción: '{request.message}'. Actualmente operando con consultas conectadas a PostgreSQL."

        return {
            "status": "success",
            "response": resp
        }