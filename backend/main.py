import io
import os
from langchain_core.messages import HumanMessage
from agents.workflow import app_agent, UNAVAILABLE_MSG
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import pandas as pd

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
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def crear_usuario_admin_por_defecto(db: Session):
    admin_email = os.getenv("ADMIN_EMAIL", "").strip()
    admin_password = os.getenv("ADMIN_PASSWORD", "").strip()
    if not admin_email or not admin_password:
        return
    existing_admin = db.query(models.User).filter(models.User.email == admin_email).first()
    if not existing_admin:
        default_admin = models.User(
            full_name=os.getenv("ADMIN_NAME", "Administrador PluriOne"),
            email=admin_email,
            hashed_password=security.hash_password(admin_password),
            role="admin",
            is_active=True,
        )
        db.add(default_admin)
        db.commit()
        print(">>> Usuario administrador inicial creado desde variables de entorno.")

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

def calculate_partial_risk(invoices, unmatched_count: int = 0) -> float:
    """Suma el faltante solo cuando hay facturas en 'Parcial' o movimientos sin conciliar."""
    has_activity_or_issue = (
        any(getattr(inv, "status", None) == "Parcial" for inv in invoices)
        or (unmatched_count > 0)
    )
    if not has_activity_or_issue:
        return 0.0

    risk = 0.0
    for inv in invoices:
        if getattr(inv, "status", None) == "Parcial":
            amt = float(getattr(inv, "amount", 0.0) or 0.0)
            paid = float(getattr(inv, "paid_amount", 0.0) or 0.0)
            risk += max(0.0, amt - paid)
    return round(risk, 2)

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
            models.Invoice(folio="FAC-1021", client="Tech Solutions Ltd", amount=45000.0, paid_amount=0.0, status="Pendiente"),
            models.Invoice(folio="FAC-1022", client="Innovación Digital SA", amount=12500.0, paid_amount=0.0, status="Pendiente"),
            models.Invoice(folio="FAC-1023", client="Consultoría Global", amount=98000.0, paid_amount=0.0, status="Pendiente"),
        ]
        db.add_all(default_invoices)
        db.commit()
        invoices = db.query(models.Invoice).all()

    conciliated_total = 0.0
    pending_risk_total = 0.0
    results = []

    for inv in invoices:
        inv_amount = float(inv.amount or 0.0)
        paid_val = float(getattr(inv, "paid_amount", 0.0) or 0.0)

        if inv.status == "Conciliado":
            conciliated_total += inv_amount
            pending_balance = 0.0
        elif inv.status == "Parcial":
            effective_paid = min(inv_amount, max(0.0, paid_val))
            pending_balance = max(0.0, inv_amount - effective_paid)
        else:
            pending_balance = inv_amount

        results.append({
            "folio": inv.folio,
            "client": inv.client,
            "amount": inv_amount,
            "paid_amount": round(paid_val, 2),
            "pending_balance": round(pending_balance, 2),
            "status": inv.status,
        })

    return {
        "summary": {
            "conciliated_amount": round(conciliated_total, 2),
            "risk_amount": calculate_partial_risk(invoices),
        },
        "invoices": results,
    }

# --- ENDPOINT DE RESETEO ---

@app.post("/api/invoices/reset")
def reset_invoices_for_testing(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Resetea paid_amount y status de las facturas a Pendiente (solo admin)."""
    allow_reset = os.getenv("ALLOW_TEST_RESET", "true").strip().lower() in ("1", "true", "yes")
    if not allow_reset:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El reseteo de pruebas está deshabilitado en este entorno."
        )

    updated_count = (
        db.query(models.Invoice)
        .update({"paid_amount": 0.0, "status": "Pendiente"})
    )
    db.commit()
    return {
        "message": f"Se resetearon {updated_count} facturas a Pendiente.",
        "updated_count": updated_count,
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
            models.Invoice(folio="FAC-1021", client="Tech Solutions Ltd", amount=45000.0, paid_amount=0.0, status="Pendiente"),
            models.Invoice(folio="FAC-1022", client="Innovación Digital SA", amount=12500.0, paid_amount=0.0, status="Pendiente"),
            models.Invoice(folio="FAC-1023", client="Consultoría Global", amount=98000.0, paid_amount=0.0, status="Pendiente"),
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

                rows_pdf = []
                ultimo_folio = ""

                for raw_line in text.splitlines():
                    line = " ".join(raw_line.split()).strip()
                    if not line:
                        continue

                    folio_match = re.search(r'\bFAC-\d+\b', line, flags=re.IGNORECASE)
                    if folio_match:
                        ultimo_folio = folio_match.group(0).upper()

                    # Limpia folios y fechas (dd/mm/yyyy o yyyy-mm-dd) para no tomarlos como montos
                    line_limpia = re.sub(r'\bFAC-\d+\b', ' ', line, flags=re.IGNORECASE)
                    line_limpia = re.sub(r'\b\d{1,2}/\d{1,2}/\d{2,4}\b', ' ', line_limpia)
                    line_limpia = re.sub(r'\b\d{4}-\d{1,2}-\d{1,2}\b', ' ', line_limpia)

                    # 1) Montos con decimales (ej. 45,000.00 o $12500.50)
                    dec_matches = re.findall(r'(?:\$\s*)?(\d{1,3}(?:,\d{3})*\.\d{1,2}|\d+\.\d{1,2})', line_limpia)

                    # 2) Si no hay decimales, enteros >= 100 que no sean años (1900-2100)
                    candidatos = dec_matches
                    if not candidatos:
                        int_matches = re.findall(r'(?:\$\s*)?(\d{1,3}(?:,\d{3})*|\d+)', line_limpia)
                        for tok in int_matches:
                            num = int(tok.replace(',', ''))
                            if num >= 100 and not (1900 <= num <= 2100):
                                candidatos.append(tok)

                    if candidatos:
                        monto_val = float(candidatos[-1].replace('$', '').replace(',', '').strip())
                        if monto_val > 0:
                            detalle = f"{ultimo_folio} - {line}".strip(" -") if ultimo_folio else line
                            rows_pdf.append({
                                "abono": monto_val,
                                "descripcion": detalle
                            })

                if not rows_pdf:
                    raise HTTPException(status_code=400, detail="No se detectaron movimientos legibles en el PDF.")

                df = pd.DataFrame(rows_pdf)
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

    ref_col = next(
        (c for c in ['referencia', 'folio'] if c in df.columns),
        None
    )
    desc_col = next(
        (c for c in ['concepto', 'descripcion', 'descripción', 'detalle', 'observaciones'] if c in df.columns),
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
                    ref_texto = str(row[ref_col]).strip() if ref_col and pd.notnull(row[ref_col]) else ""
                    desc_texto = str(row[desc_col]).strip() if desc_col and pd.notnull(row[desc_col]) else ""

                    if ref_texto and desc_texto and ref_texto.lower() not in desc_texto.lower():
                        detalle_texto = f"{ref_texto} - {desc_texto}"
                    else:
                        detalle_texto = ref_texto or desc_texto

                    movimientos.append({
                        "amount": monto_val,
                        "detail": detalle_texto
                    })
    conciliated_total = 0.0
    results = []
    matched_indices = set()

    for inv in invoices:
        inv_amount = float(inv.amount or 0.0)
        prev_paid = float(getattr(inv, "paid_amount", 0.0) or 0.0)
        folio_lower = str(inv.folio).strip().lower()

        # Si la factura ya estaba liquidada en PostgreSQL, no absorbe nuevos depósitos
        if prev_paid >= inv_amount - 0.01 and inv_amount > 0:
            inv.status = "Conciliado"
            inv.paid_amount = inv_amount
            conciliated_total += inv_amount
            saldo_pendiente = 0.0
        else:
            abono_nuevo = 0.0
            for idx, mov in enumerate(movimientos):
                if idx in matched_indices:
                    continue

                detail_lower = mov["detail"].lower()
                # Exigir que el movimiento mencione explícitamente este folio
                if folio_lower not in detail_lower:
                    continue

                restante = inv_amount - (prev_paid + abono_nuevo)
                if restante <= 0.01:
                    # La factura ya se cubrió: cualquier otro movimiento con este folio queda como duplicado/sin conciliar
                    break

                matched_indices.add(idx)
                abono_nuevo += mov["amount"]

            total_abonado = prev_paid + abono_nuevo
            if total_abonado >= inv_amount - 0.01 and inv_amount > 0:
                inv.status = "Conciliado"
                inv.paid_amount = inv_amount
                conciliated_total += inv_amount
                saldo_pendiente = 0.0
            elif total_abonado > 0:
                inv.status = "Parcial"
                inv.paid_amount = round(total_abonado, 2)
                saldo_pendiente = max(0.0, inv_amount - inv.paid_amount)
            else:
                inv.status = "Pendiente"
                inv.paid_amount = 0.0
                saldo_pendiente = inv_amount

        results.append({
            "folio": inv.folio,
            "client": inv.client,
            "amount": inv_amount,
            "paid_amount": round(float(inv.paid_amount or 0.0), 2),
            "pending_balance": round(saldo_pendiente, 2),
            "status": inv.status,
        })

    unmatched_abonos = []
    unmatched_details = []
    for idx, mov in enumerate(movimientos):
        if idx not in matched_indices:
            unmatched_abonos.append(mov["amount"])
            unmatched_details.append({
                "amount": mov["amount"],
                "detail": mov["detail"] or "Movimiento / depósito sin identificar"
            })

    db.commit()

    final_risk = calculate_partial_risk(invoices, len(unmatched_details))

    return {
        "summary": {
            "conciliated_amount": round(conciliated_total, 2),
            "risk_amount": final_risk,
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

    config = {"configurable": {"thread_id": f"user-{current_user.email}"}}

    try:
        result = app_agent.invoke(
            {"messages": [HumanMessage(content=user_message)]},
            config=config,
        )
        messages = result.get("messages", [])
        if not messages:
            return {"response": UNAVAILABLE_MSG}

        raw_content = messages[-1].content
        if isinstance(raw_content, list):
            reply = " ".join(
                block.get("text", "") if isinstance(block, dict) else str(block)
                for block in raw_content
            ).strip()
        else:
            reply = str(raw_content or "").strip()

        return {"response": reply if reply else UNAVAILABLE_MSG}
    except Exception:
        return {"response": UNAVAILABLE_MSG}

# --- ENDPOINT PARA MOSTRAR USUARIOS REGISTRADOS ---

@app.get("/api/users/public")
def list_public_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "name": u.full_name,
            "email": u.email,
        }
        for u in users
    ]