# Bitácora Diaria de Recuperación — PluriOne FinTech

Desarrollador: Diego Jahir Almazán Blas
Repositorio: `G19X-TESCI-DJAB-834-ACADEMIC`
Objetivo: Resolución de observaciones técnicas y funcionales del dictamen de evaluación (plan de 30 horas).

# Lunes 23 de noviembre de 2026

## Diagnóstico de entorno, autenticación y limpieza de respuestas preparadas (Punto 2)

**Qué hice:**
 - Revisé las observaciones del dictamen y el plan de recuperación de 9 puntos.
 - Corregí el error en el entorno virtual del backend (`AttributeError: module 'bcrypt' has no attribute '__about__'` y límite de 72 bytes en `passlib`) fijando `bcrypt==4.0.1` y truncando contraseñas a 72 bytes en `backend/security.py` para permitir el registro e inicio de sesión contra PostgreSQL.
 - Eliminé las respuestas preparadas, cifras fijas y plantillas por palabra clave en `backend/agents/workflow.py` y en `POST /api/chat` en `backend/main.py`, dejando el mensaje explícito de no disponibilidad cuando no hay modelo disponible o falla la invocación.

**Qué me costó trabajo:**
 - Resolver el conflicto de versiones entre `passlib` y `bcrypt` en Windows y evitar bloqueos de puerto (`WinError 10048` / `10013`) al reiniciar `uvicorn`.

**Qué le pedí a la IA:**
 - Solicité apoyo para diagnosticar el traceback de `passlib`/`bcrypt` al registrar usuarios y limpiar las respuestas simuladas en `workflow.py` y `main.py`.

**Qué cambié yo de lo que me dio:**
 - Ajusté el manejo de procesos en PowerShell para liberar el puerto `8000` antes de reiniciar `uvicorn`, probé el registro e inicio de sesión en el frontend (`http://localhost:5173/`) y validé la carga de archivos `.csv` y `.xlsx` con JWT.

---

# Martes 24 de noviembre de 2026

## Herramienta sobre PostgreSQL y conexión al grafo (Puntos 1 y 3)

**Qué hice:**
 - Creé el módulo `backend/agents/tools.py` con la herramienta `@tool` `consultar_facturas_postgres(folio, estado)` conectada a PostgreSQL mediante `SessionLocal` y `models.Invoice`.
 - Actualicé `AgentState` en `backend/agents/workflow.py` con `Annotated[list, add_messages]`, configuré `ToolNode(tools)` con `should_continue` y conecté el historial con `MemorySaver`.

**Qué me costó trabajo:**
 - Evitar importaciones circulares entre `backend/agents/tools.py` y `backend/agents/workflow.py`, y asegurar que `sys.path` resolviera `database` y `models` al ejecutar `uvicorn` desde `backend/`.

**Qué le pedí a la IA:**
 - Pedí una estructura para exponer una consulta SQLAlchemy como herramienta de LangGraph (`@tool`), conservar el historial de mensajes y vincularla al `StateGraph`.

**Qué cambié yo de lo que me dio:**
 - Depuré `backend/agents/tools.py` eliminando una importación redundante que provocaba ciclo y limpié una reasignación duplicada `tools = []` en `backend/agents/workflow.py` que habría dejado el grafo sin herramientas registradas.

---

# Miércoles 25 de noviembre de 2026

## Pagos parciales, tablero desde PostgreSQL y seguridad básica (Puntos 4, 5 y 6)

**Qué hice:**
 - Revisé la lógica de conciliación y consulta de facturas en `backend/main.py` (`/api/reconcile` y `/api/invoices`) y el modelo en `backend/models.py` (`paid_amount`, `pending_balance` y estado `Parcial`) para que los abonos parciales no cuenten como conciliados completos y sumen su saldo restante al riesgo.
 - Eliminé cifras y facturas quemadas en `DataViewer.jsx` para cargar los datos reales desde PostgreSQL, y revisé `App.jsx` y `AgentChat.jsx` con manejo de token JWT, soporte `.pdf` y avisos de movimientos sin identificar.
 - Revisé `backend/security.py`, `backend/main.py`, `schema.sql` y `.env.example` para mantener secretos y credenciales fuera del código/documentación y alinear `paid_amount` en `schema.sql`.

**Qué me costó trabajo:**
 - Mantener sincronizados el esquema SQL inicial (`schema.sql`), el modelo ORM (`models.py`) y el cálculo de saldos pendientes entre los endpoints y el tablero.

**Qué le pedí a la IA:**
 - Pedí revisión cruzada de los endpoints, componentes React, plantilla de entorno y esquema SQL frente a los criterios de evaluación.

**Qué cambié yo de lo que me dio:**
- Adapté cada ajuste a mis archivos reales en VS Code y verifiqué el flujo de autenticación, conciliación y visualización de datos.

---

# Jueves 26 de noviembre de 2026

## Alineación documental, bitácora por días y cierre de pendientes (Puntos 7, 8 y 9)

**Qué hice:**
 - Actualicé `README.md`, `PRD.md`, `MVP.md` y `USO_IA.md` para reflejar el estado real del sistema, separar el trabajo futuro y documentar la instalación y archivos de ejemplo sin exponer secretos.
 - Reorganicé `BITACORA_RECUPERACION.md` para registrar día por día (lunes a jueves) los avances reales y los ajustes pendientes de cierre como las pruebas automatizadas.

**Qué me costó trabajo:**
- Ordenar cronológicamente las actividades de cada día y mantener la documentación alineada con el código ya modificado.

**Qué le pedí a la IA:**
 - Solicité apoyo para redactar y depurar los documentos del proyecto y distribuir la bitácora según los días reales de trabajo.

**Qué cambié yo de lo que me dio:**
 - Revisé cada sección frente a los archivos de mi repositorio y ajusté los detalles para que correspondan fielmente a mi proceso de trabajo.