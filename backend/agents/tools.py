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
    Consulta las facturas registradas actualmente en PostgreSQL.
    Úsala siempre con folio="" y estado="" para obtener el panorama completo
    de facturas conciliadas, parciales, pendientes, montos, alertas o riesgos.
    También acepta filtrar por un folio específico (ej. 'FAC-1021') o un estado
    ('Pendiente', 'Parcial', 'Conciliado').
    """
    db = SessionLocal()
    try:
        query = db.query(models.Invoice)

        if folio and folio.strip():
            query = query.filter(models.Invoice.folio.ilike(f"%{folio.strip()}%"))
        else:
            estado_limpio = (estado or "").strip().lower()
            estados_generales = {
                "",
                "riesgo",
                "alerta",
                "alertas",
                "discrepancia",
                "discrepancias",
                "todas",
                "todos",
                "resumen",
            }
            if estado_limpio not in estados_generales:
                query = query.filter(models.Invoice.status.ilike(f"%{estado_limpio}%"))

        facturas = query.order_by(models.Invoice.id.asc()).all()
        if not facturas:
            return "No se encontraron facturas en PostgreSQL con los criterios solicitados."

        total_facturado = 0.0
        total_conciliado = 0.0
        total_riesgo_pendiente = 0.0
        lineas = []

        for f in facturas:
            monto = float(f.amount or 0.0)
            pagado = float(f.paid_amount or 0.0)
            total_facturado += monto

            if f.status == "Conciliado":
                total_conciliado += monto
                pendiente = 0.0
            else:
                abonado_efectivo = min(monto, max(0.0, pagado)) if f.status == "Parcial" else 0.0
                pendiente = max(0.0, monto - abonado_efectivo)
                total_riesgo_pendiente += pendiente

            lineas.append(
                f"- Folio: {f.folio} | Cliente: {f.client} | "
                f"Monto: ${monto:,.2f} MXN | Pagado: ${pagado:,.2f} MXN | "
                f"Saldo pendiente: ${pendiente:,.2f} MXN | Estado: {f.status}"
            )

        resumen = (
            f"Facturas: {len(facturas)} | "
            f"Total facturado: ${total_facturado:,.2f} MXN | "
            f"Cuentas conciliadas: ${total_conciliado:,.2f} MXN | "
            f"Alerta de riesgo (faltante): ${total_riesgo_pendiente:,.2f} MXN"
        )
        return f"Datos reales en PostgreSQL ({resumen}):\n" + "\n".join(lineas)
    except Exception as exc:
        return f"Error al consultar facturas en PostgreSQL: {str(exc)}"
    finally:
        db.close()