# Definición del MVP y Arquitectura de Agentes Inteligentes

## 1. Alcance del MVP

El Minimum Viable Product (MVP) conecta un frontend en React y Vite con una API en FastAPI y una base de datos PostgreSQL para gestionar autenticación JWT, consulta de facturas, conciliación de estados de cuenta (CSV, Excel y PDF) con soporte de pagos parciales, liquidaciones, duplicados y movimientos sin conciliar, y consultas mediante un agente en LangGraph respaldado por una herramienta sobre PostgreSQL.

---

## 2. Pila Tecnológica Real (Tech Stack)

 - **Backend y Orquestación**: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy, Pandas, `openpyxl`, `pypdf`, LangChain, LangGraph, `langchain-ollama` (`ChatOllama`).
 - **Base de Datos y Contenedores**: PostgreSQL 15, Docker, Docker Compose.
 - **Frontend**: React.js, Vite, Lucide Icons.
 - **Seguridad**: JWT (`PyJWT`) y hash de contraseñas con Passlib (`bcrypt`).

---

## 3. Arquitectura y Componentes del Sistema

El flujo principal conecta la interfaz web con FastAPI, PostgreSQL y el grafo de LangGraph:

```text```
[ Usuario / Frontend (React + Vite) ]
  │
  ▼ (JWT Bearer Token)
┌────────────────────────────────────────────────────────┐
│               FastAPI Backend (main.py)                │
└────────────┬───────────────────────────────┬───────────┘
             │                               │
             ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  Motor de Conciliación   │    │    Agente LangGraph      │
│  CSV / Excel / PDF       │    │  ChatOllama + ToolNode   │
│  (Pandas / pypdf)        │    │  (consultar_facturas_pg) │
└────────────┬─────────────┘    └────────────┬─────────────┘
             │                               │
             └───────────────┬───────────────┘
                             │
                             ▼
            ┌─────────────────────────────────┐
            │ PostgreSQL (users e invoices)   │
            └─────────────────────────────────┘

### 3.1. Frontend (React + Vite)

 - **Header y Autenticación**: Inicio de sesión contra /api/login y gestión del token JWT.
 - **Tablero Financiero (`DataViewer.jsx`)**: Consulta /api/invoices para mostrar facturas, montos abonados, saldos pendientes y totales conciliados o en riesgo desde PostgreSQL; incluye historial de estados de cuenta analizados, exportación a CSV y reseteo de pruebas (/api/invoices/reset) coordinado con App.jsx para limpiar el historial y reiniciar la consola.
 - **Consola Agéntica (`AgentChat.jsx`)**: Envío de consultas a /api/chat, carga de archivos de estado de cuenta a /api/reconcile y reinicio automático al saludo inicial cuando se dispara una nueva ronda de pruebas.

### 3.2. Backend (FastAPI)

 - **Autenticación y Usuarios**: /api/register, /api/login, /api/users (GET, DELETE con rol admin).
 - **Facturas (`/api/invoices`)**: Lectura de facturas y cálculo dinámico de conciliated_amount y risk_amount desde PostgreSQL, además del reseteo de estados/saldos en /api/invoices/reset.
 - **Conciliación (`/api/reconcile`)**: Procesamiento de CSV, Excel y PDF, actualización de status (Pendiente, Parcial, Conciliado), paid_amount y reporte de abonos no emparejados.
 - **Chat Agéntico (`/api/chat`)**: Invocación de app_agent con thread_id por usuario y retorno del mensaje de no disponibilidad si el modelo no está configurado o falla.

### 3.3 Agente y Herramientas (`backend/agents/`)

 - **`workflow.py`**: Grafo de LangGraph con AgentState (add_messages), nodo agent (ChatOllama), nodo tools (ToolNode) y MemorySaver.
 - **`tools.py`**: Herramienta consultar_facturas_postgres para consultar facturas por folio, estado o listado completo en PostgreSQL.

### 3.4 Datos de Prueba (Estados De Cuentas/)

 - Carpeta con los conjuntos de ejemplo (Estado De Cuenta 1 a 5 en formatos .csv, .xlsx y .pdf, además de estado_cuenta_ejemplo.csv en la raíz) para validar escenarios de liquidación total, pagos parciales, pagos fraccionados secuenciales, abonos duplicados y movimientos sin identificar.

---

## 4. Guía de Ejecución Rápida
1. Copiar .env.example a .env y configurar las variables locales.
2. Levantar PostgreSQL: docker compose up -d
3. Iniciar el backend FastAPI: uvicorn main:app --reload
4. Iniciar el frontend React: npm run dev

---

## 5. Trabajo Futuro

 - Incorporación de Redis para caché o sesiones distribuidas.
 - Integración de Azure AI Search para indexación documental.
 - Expansión hacia un esquema multi-agente especializado y reportes automatizados avanzados.