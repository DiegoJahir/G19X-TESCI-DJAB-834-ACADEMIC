# Declaración de Uso de Inteligencia Artificial — PluriOne FinTech

Autor: Diego Jahir Almazán Blas
Proyecto: Arquitectura Agéntica Corporativa para Conciliación Bancaria (PluriOne)
Periodo: Semana de recuperación (noviembre de 2026)

---

# 1. Herramientas de IA utilizadas y propósito

**Asistente de desarrollo en sesión**:
 - **Para qué partes se utilizó**: Diagnóstico de trazas de error en Python/FastAPI (`passlib`/`bcrypt`, puertos en Windows, compatibilidad `httpx`/`ASGITransport` y `pytest`), estructuración de herramientas de LangGraph (`@tool`), revisión de código en `backend/agents/workflow.py`, `backend/agents/tools.py`, `backend/main.py`, `backend/security.py`, `backend/models.py`, pruebas en `backend/tests/test_reconcile_and_agent.py` y componentes del frontend (`DataViewer.jsx`, `AgentChat.jsx`, `App.jsx`), así como depuración de documentación (`README.md`, `PRD.md`, `MVP.md`, `BITACORA_RECUPERACION.md`, `.env.example`, `schema.sql`), configuración de `.gitignore` y preparación de ejemplos de prueba en `Estados De Cuentas/`.
 - **Modelo del sistema (`workflow.py`):** El grafo de LangGraph utiliza `ChatOllama` (`langchain-ollama`) con `MemorySaver` y la herramienta `consultar_facturas_postgres` para consultar facturas reales en PostgreSQL. Cuando no hay modelo disponible o falla su invocación, el sistema devuelve un mensaje explícito de no disponibilidad sin inventar folios ni montos.

---

# 2. Decisiones técnicas tomadas por el autor

 - **Aislamiento de credenciales y entorno**: Mantener secretos y credenciales únicamente en el archivo `.env` local, evitar contraseñas o claves literales en el código, `README.md` y `schema.sql`, mantener `.env.example` con marcadores sin valores reales y fijar `bcrypt==4.0.1` en el entorno virtual para compatibilidad con `passlib`.
 - **Consulta directa a PostgreSQL y abonos parciales (`RF-04`)**: Garantizar que tanto el agente (`consultar_facturas_postgres`) como el tablero (`GET /api/invoices` y `DataViewer.jsx`) lean cifras reales de PostgreSQL sin datos quemados, que los pagos parciales (`Parcial`) registren `paid_amount` y `pending_balance` en riesgo sin contarse como conciliados completos, y que no se crucen abonos parciales dirigidos a otro folio.
 - **Coordinación de reseteo y archivos de prueba en Git**: Sincronizar el botón **Resetear pruebas** en `DataViewer.jsx` con `App.jsx` (`resetSignal`) y `AgentChat.jsx` para restablecer facturas, limpiar el historial y devolver la consola agéntica a su saludo inicial, además de configurar `.gitignore` para permitir el seguimiento de los archivos de ejemplo en `Estados De Cuentas/` (`.csv`, `.xlsx` y `.pdf`).
 - **Pruebas automatizadas y validación manual**: Construir pruebas en `backend/tests/test_reconcile_and_agent.py` ejecutadas con `pytest -v` y validar manualmente cada archivo en el entorno local con Docker (PostgreSQL), FastAPI y React/Vite antes de confirmar los cambios.

---

# 3. Registro de conversaciones principales con el asistente

 - **Sesión 1 — Depuración de autenticación, carga de archivos y plan de recuperación**: Resolución de conflictos de `bcrypt`/`passlib`, pruebas de JWT, revisión de carga `.csv`/`.xlsx`/`.pdf`, eliminación de respuestas preparadas y creación de `consultar_facturas_postgres`.
 - **Sesión 2 — Alineación integral frente a los 9 criterios de evaluación**: Revisión de `workflow.py`, `tools.py`, `main.py`, `security.py`, `models.py`, `schema.sql`, `DataViewer.jsx`, `AgentChat.jsx`, `App.jsx`, `.env.example`, `README.md`, `PRD.md` y `MVP.md` para asegurar consistencia técnica y documental.
 - **Sesión 3 — Suite de pruebas con `pytest`, cierre de documentación y preparación para Git**: Implementación de `backend/tests/test_reconcile_and_agent.py`, ajuste de coincidencia de pagos parciales en `backend/main.py`, verificación de los 4 casos de prueba, sincronización de `resetSignal` entre `DataViewer.jsx`, `App.jsx` y `AgentChat.jsx`, habilitación de `Estados De Cuentas/` en `.gitignore` y actualización de `requirements.txt`, `BITACORA_RECUPERACION.md`, `USO_IA.md`, `PRD.md`, `MVP.md` y `README.md`.