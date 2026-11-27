import asyncio
import io
import os
import sys
from pathlib import Path

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")

import database as db_module  # noqa: E402
from database import Base, get_db  # noqa: E402
import main  # noqa: E402
import models  # noqa: E402
import security  # noqa: E402
from agents import tools as agent_tools  # noqa: E402

@pytest.fixture()
def test_env():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        user = models.User(
            full_name="Analista Pruebas",
            email="analista.test@plurione.com",
            hashed_password=security.hash_password("TestPassword123!"),
            role="analyst",
            is_active=True,
        )
        db.add(user)
        db.add_all(
            [
                models.Invoice(
                    folio="FAC-1021",
                    client="Tech Solutions Ltd",
                    amount=45000.0,
                    paid_amount=0.0,
                    status="Pendiente",
                ),
                models.Invoice(
                    folio="FAC-1022",
                    client="Innovación Digital SA",
                    amount=12500.0,
                    paid_amount=0.0,
                    status="Pendiente",
                ),
                models.Invoice(
                    folio="FAC-1023",
                    client="Consultoría Global",
                    amount=98000.0,
                    paid_amount=0.0,
                    status="Pendiente",
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    main.app.dependency_overrides[get_db] = override_get_db
    token = security.create_access_token({"sub": "analista.test@plurione.com", "role": "analyst"})
    headers = {"Authorization": f"Bearer {token}"}

    original_agent_session = agent_tools.SessionLocal
    original_db_session = db_module.SessionLocal
    agent_tools.SessionLocal = TestingSessionLocal
    db_module.SessionLocal = TestingSessionLocal

    try:
        yield {
            "headers": headers,
            "SessionLocal": TestingSessionLocal,
        }
    finally:
        agent_tools.SessionLocal = original_agent_session
        db_module.SessionLocal = original_db_session
        main.app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def _csv_upload(rows: list[tuple[str, str, float, float]]) -> dict:
    lines = ["Fecha,Referencia,Concepto,Cargo,Abono,Saldo"]
    for idx, (ref, concepto, cargo, abono) in enumerate(rows, start=1):
        lines.append(f"2026-11-{idx:02d},{ref},{concepto},{cargo},{abono},0.0")
    content = "\n".join(lines).encode("utf-8")
    return {"file": ("estado_cuenta.csv", io.BytesIO(content), "text/csv")}


async def _post_reconcile(headers: dict, rows: list[tuple[str, str, float, float]]) -> httpx.Response:
    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        return await client.post("/api/reconcile", headers=headers, files=_csv_upload(rows))


def test_conciliacion_pago_completo(test_env):
    response = asyncio.run(
        _post_reconcile(test_env["headers"], [("REF-01", "Pago FAC-1021", 0.0, 45000.0)])
    )
    assert response.status_code == 200
    payload = response.json()

    invoices_by_folio = {inv["folio"]: inv for inv in payload["invoices"]}
    fac_1021 = invoices_by_folio["FAC-1021"]

    assert fac_1021["status"] == "Conciliado"
    assert fac_1021["paid_amount"] == pytest.approx(45000.0)
    assert fac_1021["pending_balance"] == pytest.approx(0.0)
    assert payload["summary"]["conciliated_amount"] == pytest.approx(45000.0)
    assert payload["summary"]["risk_amount"] == pytest.approx(12500.0 + 98000.0)


def test_conciliacion_pago_parcial_no_cuenta_como_conciliado_completo(test_env):
    response = asyncio.run(
        _post_reconcile(test_env["headers"], [("REF-02", "Abono parcial FAC-1021", 0.0, 15000.0)])
    )
    assert response.status_code == 200
    payload = response.json()

    invoices_by_folio = {inv["folio"]: inv for inv in payload["invoices"]}
    fac_1021 = invoices_by_folio["FAC-1021"]

    assert fac_1021["status"] == "Parcial"
    assert fac_1021["paid_amount"] == pytest.approx(15000.0)
    assert fac_1021["pending_balance"] == pytest.approx(30000.0)

    assert payload["summary"]["conciliated_amount"] == pytest.approx(0.0)
    assert payload["summary"]["risk_amount"] == pytest.approx(30000.0 + 12500.0 + 98000.0)


def test_conciliacion_pago_inexistente_reporta_no_conciliado(test_env):
    response = asyncio.run(
        _post_reconcile(test_env["headers"], [("REF-03", "Transferencia no identificada", 0.0, 500.0)])
    )
    assert response.status_code == 200
    payload = response.json()

    assert payload["summary"]["conciliated_amount"] == pytest.approx(0.0)
    assert payload["summary"]["risk_amount"] == pytest.approx(45000.0 + 12500.0 + 98000.0)
    assert all(inv["status"] == "Pendiente" for inv in payload["invoices"])

    unmatched = payload["summary"].get("unmatched_abonos", [])
    assert any(float(item) == pytest.approx(500.0) for item in unmatched)


def test_herramienta_consultar_facturas_postgres(test_env):
    response = asyncio.run(
        _post_reconcile(test_env["headers"], [("REF-04", "Abono parcial FAC-1022", 0.0, 2500.0)])
    )
    assert response.status_code == 200
    payload = response.json()
    invoices_by_folio = {inv["folio"]: inv for inv in payload["invoices"]}
    assert invoices_by_folio["FAC-1022"]["status"] == "Parcial"

    resultado_folio = agent_tools.consultar_facturas_postgres.invoke({"folio": "FAC-1022"})
    assert "FAC-1022" in resultado_folio
    assert "Parcial" in resultado_folio

    resultado_pendientes = agent_tools.consultar_facturas_postgres.invoke({"estado": "Pendiente"})
    assert "FAC-1021" in resultado_pendientes
    assert "FAC-1023" in resultado_pendientes
    assert "FAC-1022" not in resultado_pendientes

    resultado_inexistente = agent_tools.consultar_facturas_postgres.invoke({"folio": "FAC-9999"})
    assert "No se encontraron facturas en PostgreSQL" in resultado_inexistente

async def _get_invoices(headers: dict) -> httpx.Response:
    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        return await client.get("/api/invoices", headers=headers)

def test_reconciliacion_requiere_token():
    response = asyncio.run(
        _post_reconcile(headers={}, rows=[("REF-AUTH", "Pago FAC-1021", 0.0, 45000.0)])
    )
    assert response.status_code == 401


def test_abonos_parciales_acumulados_completan_factura(test_env):
    first = asyncio.run(
        _post_reconcile(test_env["headers"], [("REF-P1", "Abono parcial FAC-1022", 0.0, 5000.0)])
    )
    assert first.status_code == 200
    inv_after_first = {i["folio"]: i for i in first.json()["invoices"]}["FAC-1022"]
    assert inv_after_first["status"] == "Parcial"
    assert inv_after_first["paid_amount"] == pytest.approx(5000.0)
    assert inv_after_first["pending_balance"] == pytest.approx(7500.0)

    second = asyncio.run(
        _post_reconcile(test_env["headers"], [("REF-P2", "Abono parcial FAC-1022", 0.0, 7500.0)])
    )
    assert second.status_code == 200
    inv_after_second = {i["folio"]: i for i in second.json()["invoices"]}["FAC-1022"]
    assert inv_after_second["status"] == "Conciliado"
    assert inv_after_second["paid_amount"] == pytest.approx(12500.0)
    assert inv_after_second["pending_balance"] == pytest.approx(0.0)


def test_tablero_invoices_refleja_cambios_en_base_de_datos(test_env):
    asyncio.run(
        _post_reconcile(test_env["headers"], [("REF-DB", "Pago FAC-1021", 0.0, 45000.0)])
    )
    res = asyncio.run(_get_invoices(test_env["headers"]))
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["conciliated_amount"] == pytest.approx(45000.0)
    assert data["summary"]["risk_amount"] == pytest.approx(12500.0 + 98000.0)


def test_agente_no_disponible_devuelve_mensaje_claro(monkeypatch):
    from agents import workflow

    monkeypatch.setattr(workflow, "OLLAMA_MODEL", "")
    salida = workflow.call_model({"messages": []})
    assert salida["messages"]
    assert "El asistente no está disponible" in salida["messages"][-1].content