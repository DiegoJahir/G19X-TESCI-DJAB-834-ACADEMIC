from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io

import models, schemas, security
from database import engine, get_db

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
    new_user = models.User(
        full_name=user.full_name,
        email=user.email,
        hashed_password=hashed_pwd,
        role=user.role
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
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.delete("/api/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user_to_delete = db.query(models.User).filter(models.User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(user_to_delete)
    db.commit()
    return {"message": f"Usuario con ID {user_id} eliminado exitosamente"}

# --- ENDPOINT DE CONCILIACIÓN BANCARIA (AGENTE FINANCIERO) ---

@app.post("/api/reconcile")
async def reconcile_statement(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Obtener las facturas registradas en la base de datos
    invoices = db.query(models.Invoice).all()
    
    # Si la tabla está vacía, se inicializan las facturas base para la demostración
    if not invoices:
        default_invoices = [
            models.Invoice(folio="FAC-1021", client="Tech Solutions Ltd", amount=45000.0, status="Pendiente"),
            models.Invoice(folio="FAC-1022", client="Innovación Digital SA", amount=12500.0, status="Pendiente"),
            models.Invoice(folio="FAC-1023", client="Consultoría Global", amount=98000.0, status="Pendiente"),
        ]
        db.add_all(default_invoices)
        db.commit()
        invoices = db.query(models.Invoice).all()

    # 2. Leer y parsear el archivo del estado de cuenta subido (CSV o Excel)
    contents = await file.read()
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado. Sube un archivo CSV o Excel.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo: {str(e)}")

    # Normalizar encabezados de columna
    df.columns = [str(col).strip().lower() for col in df.columns]

    # 3. Extraer los montos abonados
    abonos = []
    if 'abono' in df.columns:
        abonos = df['abono'].dropna().tolist()
    elif 'monto' in df.columns:
        abonos = df['monto'].dropna().tolist()

    conciliated_total = 0.0
    pending_risk_total = 0.0
    results = []

    # 4. Cruzar abonados contra facturas registradas
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