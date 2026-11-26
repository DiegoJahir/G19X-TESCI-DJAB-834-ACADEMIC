## Proyecto de Desarrollo de una Arquitectura Agentic para Finanzas Corporativas
## Sistema agéntico empresarial desarrollado para PluriOne S.A. de C.V. enfocado en la automatización de procesos financieros mediante inteligencia artificial, orquestación de agentes, conciliación bancaria y análisis de riesgo en tiempo real.

## Pila Tecnológica:
 - **Backend y Orquestación**: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy, Pandas, `openpyxl`, `pypdf`, LangChain, LangGraph, Ollama (`ChatOllama`) y `pytest`.
 - **Base de Datos y Contenedores**: PostgreSQL 15, Docker, Docker Compose.
 - **Frontend**: React.js, Vite, Lucide Icons.

## Cómo levantarlo en una máquina limpia
 - Docker Desktop instalado y en ejecución.
 - Python 3.10+ y Node.js 18+.
 - Ollama instalado si vas a usar el modelo local (`OLLAMA_MODEL`, por defecto `qwen2.5:3b`) y haber descargado el modelo (`ollama pull qwen2.5:3b`).

**1 Clonar el repositorio y configurar variables de entorno**

 - Ejecuta en tu terminal:git clone https://github.com/DiegoJahir/G19X-TESCI-DJAB-834-ACADEMIC.gitcd G19X-TESCI-DJAB-834-ACADEMIC
 - env.example .env

 - Crea un archivo .env en la raíz del proyecto basado en .env.example con los siguientes valores:
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=<tu_password_bd>
    POSTGRES_DB=bank_db
    DATABASE_URL=postgresql+psycopg://postgres:<tu_password_bd>@localhost:5432/bank_db
    SECRET_KEY=<tu_clave_secreta_jwt>

**2 Levantar la Base de Datos con Docker**

 - Desde la raíz del proyecto, inicia PostgreSQL y PgAdmin: 
    docker compose up -d
 - La base de datos bank_db se inicializará automáticamente con las tablas y datos de prueba definidos en schema.sql).

**3 Levantar el Backend (FastAPI)**

 - Abre una terminal, entra a backend/, crea e inicia el entorno virtual e instala dependencias:
    cd backend
    python -m venv venv

 - Activar entorno virtual 
    (En Windows (PowerShell): .\venv\Scripts\activate)
    (En Linux/macOS: source venv/bin/activate)
    pip install -r requirements.txt
    uvicorn main:app --reload

 - Servicios activos:
    API en: http://127.0.0.1:8000
    Documentación interactiva (Swagger UI): http://127.0.0.1:8000/docs (Agrega manualmente /docs al navegador para ver el panel visual de pruebas).

**4 Levantar el Frontend (React)**

 - En una segunda terminal, entra a frontend/, instala paquetes e inicia Vite:
    cd frontend
    npm install
    npm run dev
    Interfaz web disponible en: http://localhost:5173

# Guía de Prueba (Validación)

**1 Inicio de sesión**: Inicia sesión desde la interfaz web en http://localhost:5173 (o registra un usuario en /api/register / usa la cuenta configurada en .env).

**2 Conciliación bancaria**: En la interfaz web, sube el archivo de ejemplo estado_cuenta_ejemplo.csv (ubicado en la raíz del repositorio) o un archivo .xlsx / .pdf con movimientos para validar el cruce contra las facturas en PostgreSQL (FAC-1021, FAC-1022, FAC-1023), incluyendo pagos completos, parciales y abonos sin identificar.

**3 Consola agéntica**: Envía una consulta en el chat (por ejemplo, preguntar por una factura por folio o por facturas pendientes/en riesgo) para que el agente consulte PostgreSQL mediante su herramienta.

**4 Endpoints REST**: Revisa http://127.0.0.1:8000/docs para probar /api/register, /api/login, /api/invoices, /api/reconcile (con token Bearer) y /api/chat.

**5 Pruebas automatizadas (pytest)**: Desde backend/ con el entorno virtual activo, ejecuta: pytest -v

# Endpoints Principales de la API

 - GET /: Verifica el estado de la API y la conexión a PostgreSQL.
 - POST /api/register: Registro de nuevos usuarios (asigna rol analyst en el servidor).
 - POST /api/login: Autenticación y emisión de token JWT.
 - GET /api/users: Listado de usuarios (protegido, requiere rol admin).
 - DELETE /api/users/{user_id}: Eliminación de usuarios (protegido, requiere rol admin).
 - GET /api/invoices: Consulta de facturas y resumen calculado desde PostgreSQL.
 - POST /api/reconcile: Conciliación de estados de cuenta (.csv, .xlsx, .xls, .pdf) con token JWT.
 - POST /api/chat: Consulta al agente en LangGraph con token JWT.

# Estructura del Proyecto

Agentic/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── backend/
│   ├── agents/
│   │   ├── tools.py
│   │   └── workflow.py
│   ├── tests/
│   │   └── test_reconcile_and_agent.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── schemas.py
│   └── security.py
├── docs/
│   ├── BITACORA_RECUPERACION.md
│   ├── MVP.md
│   ├── PRD.md
│   └── USO_IA.md
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AgentChat.jsx
│   │   │   ├── DataViewer.jsx
│   │   │   ├── Header.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── .gitignore
├── docker-compose.yml
├── estado_cuenta_ejemplo.csv
├── README.md
└── schema.sql