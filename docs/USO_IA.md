# Declaración de Uso de Inteligencia Artificial — PluriOne FinTech

Autor: Diego Jahir Almazán Blas  
Proyecto: Arquitectura Agéntica Corporativa para Conciliación Bancaria (PluriOne)  
Periodo: Semana de recuperación (noviembre de 2026)

---

# 1. Herramientas de IA utilizadas y propósito

**Google Gemini (asistente de desarrollo en sesión web):**
**Para qué partes se utilizó:** Diagnóstico de trazas de error en Python/FastAPI (`passlib`/`bcrypt`, puertos en Windows), estructuración de herramientas de LangGraph (`@tool`), revisión de código en `backend/agents/workflow.py`, `backend/agents/tools.py` y `backend/main.py`, y redacción de borradores iniciales de documentación técnica.
**Nota sobre el modelo del sistema (`workflow.py`):** El grafo de LangGraph está preparado para conectarse a un LLM real mediante variables de entorno (`OPENAI_API_KEY` o `AZURE_OPENAI_API_KEY`, o proveedor gratuito compatible como Gemini/Groq). Cuando no existe llave configurada, el sistema responde explícitamente sin simular resultados: `"El asistente no está disponible: falta configurar la llave del modelo"`.

---

# 2. Decisiones técnicas tomadas por el autor

**Aislamiento de credenciales y entorno:** Decidí mantener las llaves de API y secretos exclusivamente fuera del código fuente mediante variables de entorno, y fijar `bcrypt==4.0.1` en el entorno virtual local para garantizar compatibilidad con `passlib` sin alterar el esquema de usuarios en PostgreSQL.
**Consulta directa a PostgreSQL sin datos simulados:** Definí que la herramienta `consultar_facturas_postgres` consultara en tiempo real la tabla `Invoice` mediante `SessionLocal`, filtrando por `folio` o `estado` y devolviendo únicamente registros existentes en la base de datos.
**Depuración e integración manual:** Revisé y corregí manualmente los archivos generados antes de cada commit (eliminando importaciones circulares en `tools.py` y una lista vacía duplicada `tools = []` en `workflow.py`), ejecutando pruebas locales con Docker (PostgreSQL + pgAdmin), FastAPI y el frontend en React/Vite.

---

# 3. Registro de conversaciones principales con el asistente

**Sesión 1 — Depuración de autenticación (`bcrypt`/`passlib`), validación de carga CSV/Excel y plan de recuperación:**  
 - Temas tratados: Resolución de `AttributeError` en `bcrypt`, pruebas de registro/inicio de sesión con JWT, verificación de carga de estados de cuenta `.csv` y `.xlsx`, eliminación de respuestas preparadas en `workflow.py` y `main.py`, y creación de `consultar_facturas_postgres`.
 - Evidencia / enlace o exportación: *(Pega aquí el enlace compartido de tu conversación de Gemini o la ruta al archivo exportado en `docs/`, por ejemplo `docs/conversaciones_ia.md`)*.