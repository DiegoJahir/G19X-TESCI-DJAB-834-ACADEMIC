# Bitácora Diaria de Recuperación — PluriOne FinTech

Desarrollador: Diego Jahir Almazán Blas  
Repositorio: `G19X-TESCI-DJAB-834-ACADEMIC`  
Objetivo: Resolución de observaciones técnicas y funcionales del dictamen de evaluación (plan de 30 horas).

# Lunes 23 de noviembre de 2026

# Bloque 1 — Diagnóstico de entorno, autenticación y limpieza de respuestas preparadas (Punto 2)

**Qué hice:**
 - Revisé las observaciones del dictamen y el plan de recuperación de 9 puntos.
 - Corregí un error en el entorno virtual del backend (`AttributeError: module 'bcrypt' has no attribute '__about__'` y límite de 72 bytes en `passlib`) fijando `bcrypt==4.0.1` y truncando contraseñas a 72 bytes en `backend/security.py` para permitir el registro e inicio de sesión funcional contra PostgreSQL.
 - Eliminé las respuestas preparadas, cifras fijas y plantillas por palabra clave en `backend/agents/workflow.py` y en el endpoint `POST /api/chat` de `backend/main.py`.
 - Configuré el mensaje explícito `"El asistente no está disponible: falta configurar la llave del modelo"` cuando no hay proveedor LLM configurado o falla la invocación.
**Qué me costó trabajo:**
 - Resolver el conflicto de versiones entre `passlib` y `bcrypt` en Windows y evitar bloqueos de puerto (`WinError 10048` / `10013`) al reiniciar `uvicorn`.
**Qué le pedí a la IA:**
 - Solicité orientación para diagnosticar el traceback de `passlib`/`bcrypt` al registrar usuarios y estructurar la limpieza de respuestas simuladas en `workflow.py` y `main.py`.
**Qué cambié yo de lo que me dio:**
 - Ajusté el manejo de procesos en PowerShell para liberar el puerto `8000` antes de reiniciar `uvicorn`, validé manualmente el registro e inicio de sesión en el frontend (`http://localhost:5173/`) y probé la carga de archivos `.csv` y `.xlsx` autenticados con JWT.

# Bloque 2 — Creación de la primera herramienta real sobre PostgreSQL y conexión al grafo (Punto 1)

**Qué hice:**
 - Creé el módulo `backend/agents/tools.py` con la herramienta `@tool` `consultar_facturas_postgres(folio, estado)`, que abre una sesión de SQLAlchemy (`SessionLocal`) y consulta directamente la tabla de facturas (`models.Invoice`) en PostgreSQL.
 - Actualicé `AgentState` en `backend/agents/workflow.py` utilizando `Annotated[list, add_messages]` y registré `ToolNode(tools)` junto con la arista condicional `should_continue`.
**Qué me costó trabajo:**
 - Evitar importaciones circulares entre `backend/agents/tools.py` y `backend/agents/workflow.py`, y asegurar que `sys.path` resolviera correctamente `database` y `models` al ejecutar `uvicorn` desde `backend/`.
**Qué le pedí a la IA:**
 - Pedí una estructura para exponer una consulta SQLAlchemy como herramienta de LangGraph (`@tool`) y vincularla al `StateGraph`.
**Qué cambié yo de lo que me dio:**
 - Depuré `backend/agents/tools.py` eliminando una importación redundante que provocaba ciclo y limpié una reasignación duplicada `tools = []` en `backend/agents/workflow.py` que habría dejado el grafo sin herramientas registradas.

# Bloque 3 — Documentación de trazabilidad y cierre de jornada

**Qué hice:**
 - Documenté las actividades, decisiones técnicas y ajustes realizados en `docs/BITACORA_RECUPERACION.md` y `docs/USO_IA.md`.
 - Realicé los commits incrementales correspondientes a la limpieza de respuestas fijas, la herramienta de consulta a PostgreSQL y la bitácora diaria.
**Qué me costó trabajo:**
 - Organizar la evidencia técnica de cada bloque para que coincidiera exactamente con los commits del día.
**Qué le pedí a la IA:**
 - Solicité una plantilla estructurada para la bitácora diaria y la declaración de uso de IA conforme a los requisitos de entrega.
**Qué cambié yo de lo que me dio:**
 - Completé los horarios reales de trabajo, los detalles específicos de los errores encontrados en mi entorno local y los archivos modificados en mi repositorio.