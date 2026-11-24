import os
import sys
from langchain_core.tools import tool

# Garantiza que la carpeta `backend` esté en sys.path al importar desde `backend/agents/`
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import SessionLocal
import models


@tool
def consultar_facturas_postgres(folio: str = "", estado: str = "") -> str:
    """
    Consulta facturas reales almacenadas en PostgreSQL.
    Permite buscar por folio (ej. 'FAC-1021'), filtrar por estado (ej. 'Pendiente', 'Conciliado')
    o listar todas las facturas registradas si ambos parámetros van vacíos.
    """
    db = SessionLocal()
    try:
        query = db.query(models.Invoice)

        if folio and folio.strip():
            query = query.filter(models.Invoice.folio.ilike(f"%{folio.strip()}%"))

        if estado and estado.strip():
            query = query.filter(models.Invoice.status.ilike(f"%{estado.strip()}%"))

        facturas = query.order_by(models.Invoice.id.asc()).all()
        if not facturas:
            return "No se encontraron facturas en PostgreSQL con los criterios solicitados."

        total_monto = sum(float(f.amount or 0) for f in facturas)
        lineas = [
            (
                f"- Folio: {f.folio} | Cliente: {f.client} | "
                f"Monto: ${float(f.amount or 0):,.2f} MXN | Estado: {f.status}"
            )
            for f in facturas
        ]
        resumen = f"Total consultado: ${total_monto:,.2f} MXN ({len(facturas)} factura(s))"
        return f"Facturas en PostgreSQL ({resumen}):\n" + "\n".join(lineas)
    except Exception as exc:
        return f"Error al consultar facturas en PostgreSQL: {str(exc)}"
    finally:
        db.close()