Proyecto de Desarrollo de una Arquitectura Agentic para Finanzas Corporativas
Sistema agéntico empresarial desarrollado para PluriOne S.A. de C.V. enfocado en la automatización de procesos financieros mediante inteligencia artificial, orquestación de agentes, conciliación bancaria y análisis de riesgo en tiempo real.

 - Pila Tecnológica:
   Backend & Orquestación: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy, Pandas, LangChain, LangGraph.
   Base de Datos & Contenedores: PostgreSQL 15, Docker, Docker Compose.
   Frontend: React.js, Vite, Lucide Icons.

 - Cómo levantarlo en una máquina limpia
   (Prerrequisitos)
   Tener instalado Docker Desktop (y en ejecución).
   Tener instalado Python 3.10+ y Node.js 18+.





1. Clonar el repositorio y configurar variables de entorno

 - Ejecuta en tu terminal:git clone https://github.com/DiegoJahir/G19X-TESCI-DJAB-834-ACADEMIC.gitcd G19X-TESCI-DJAB-834-ACADEMIC

 - Crea un archivo .env en la raíz del proyecto basado en .env.example con los siguientes valores:
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgrespassword
   POSTGRES_DB=bank_db
   DATABASE_URL=postgresql+psycopg://postgres:postgrespassword@localhost:5432/bank_db
   SECRET_KEY=clave_secreta_jwt_plurione

2. Levantar la Base de Datos con Docker

 - Desde la raíz del proyecto, inicia PostgreSQL y PgAdmin:docker compose up -d(La base de datos bank_db se inicializará automáticamente con las tablas y datos de prueba definidos en schema.sql).

3. Levantar el Backend (FastAPI)

 - Abre una terminal, entra a backend/, crea e inicia el entorno virtual e instala dependencias:
   cd backend
   python -m venv venv

 - Activar entorno virtual 
   (En Windows (PowerShell): .\venv\Scripts\activate)
   (En Linux/macOS: source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload

 - Servicios activos:
   API en: http://127.0.0.1:8000
   Documentación interactiva (Swagger UI): http://127.0.0.1:8000/docs (Agrega manualmente /docs al navegador para ver el panel visual de pruebas).

4. Levantar el Frontend (React)
 - En una segunda terminal, entra a frontend/, instala paquetes e inicia Vite:
   cd frontend
   npm install
   npm run dev
   Interfaz web disponible en: http://localhost:5173





Guía de Prueba (Validación)

1. Conciliación Bancaria: En la interfaz web (http://localhost:5173), arrastra o selecciona el archivo estado_cuenta_ejemplo.csv incluido en la raíz del repositorio para validar el cruce automático contra las facturas precargadas (FAC-1021, FAC-1022, FAC-1023).

2. Consola Agéntica: Escribe una instrucción en el chat inferior (requiere configurar AZURE_OPENAI_API_KEY y AZURE_OPENAI_ENDPOINT en el .env para respuestas generativas del LLM).

3. Endpoints REST: Accede a http://127.0.0.1:8000/docs para probar /api/register, /api/login y las rutas protegidas por rol de administrador (/api/users).





Endpoints Principales de la API
   GET /: Verifica el estado activo de la API y conexión a PostgreSQL.
   POST /api/register: Registro de nuevos usuarios (asigna rol analyst por defecto en el servidors).
   POST /api/login: Autenticación y generación de token JWT.
   GET /api/users: Listado de usuarios (Protegido: requiere token con rol admin).
   DELETE /api/users/{user_id}: Eliminación de usuarios (Protegido: requiere token con rol admin).
   POST /api/reconcile: Procesamiento de estados de cuenta (.csv, .xlsx, .xls) mediante Pandas.
   POST /api/chat: Conexión directa con el grafo de estados del agente en LangGraph.





Estructura del Proyecto

   Agentic
   ├── .github/
   │   └── workflows/
   │       └── deploy.yml              # Pipeline de integración y despliegue continuo (CI/CD)
   ├── backend/
   │   ├── agents/
   │       └── workflow.py             # Orquestador agéntico con LangGraph y herramientas
   │   ├── database.py                 # Conexión y sesión de base de datos SQLAlchemy (PostgreSQL)
   │   ├── main.py                     # API principal en FastAPI (Endpoints de Auth, Chat y Conciliación)
   │   ├── models.py                   # Modelos ORM de la base de datos (User, Invoice)
   │   ├── schemas.py                  # Esquemas Pydantic para validación de datos y tokens
   │   ├── security.py                 # Lógica de encriptación de contraseñas y validación de JWT
   │   └── requirements.txt            # Dependencias de Python del backend
   ├── docs/
   │   ├── MVP.md                      # Definición de Arquitectura y alcance del MVP
   │   └── PRD.md                      # Product Requirements Document (Requerimientos funcionales)
   ├── frontend/
   │   ├── public/                     # Recursos estáticos (Favicon, iconos SVG)
   │   ├── src/
   │       ├── assets/                 # Imágenes y recursos visuales (hero.png, etc.)
   │       ├── components/             # Componentes modulares de la interfaz:
   │       │   ├── AgentChat.jsx       # Consola agéntica interactiva y subida de archivos
   │       │   ├── DataViewer.jsx      # Tablero dinámico de facturas, montos y riesgos
   │       │   ├── Header.jsx          # Barra superior de navegación y perfil
   │       │   └── Sidebar.jsx         # Menú lateral de opciones
   │       ├── App.jsx                 # Componente raíz del sistema frontend
   │       ├── App.css                 # Estilos corporativos oscuros / FinTech
   │       ├── index.css               # Estilos globales de la aplicación
   │       └── main.jsx                # Punto de entrada de la aplicación React
   │   ├── package.json                # Dependencias de Node.js / React
   │   └── vite.config.js              # Configuración del empaquetador Vite
   ├── .env.example                    # Plantilla de variables de entorno seguras
   ├── .gitignore                      # Exclusiones de Git (aislamiento de venv y .env)
   ├── docker-compose.yml              # Orquestación de servicios Docker (PostgreSQL y PgAdmin)
   ├── estado_cuenta_ejemplo.csv       # Archivo CSV de prueba para validación de conciliación
   ├── README.md                       # Documentación general y guía de instalación
   └── schema.sql                      # Script DDL inicial de PostgreSQL