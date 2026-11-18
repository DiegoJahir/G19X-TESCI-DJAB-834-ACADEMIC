# Definición del MVP y Arquitectura de Agentes Inteligentes

## 1. Alcance del MVP

El Minimum Viable Product (MVP) demuestra el flujo de punta a punta (*end-to-end*) de la arquitectura agéntica financiera. Permite simular el cruce de información bancaria real contra PostgreSQL, desplegando los resultados en el panel frontal de React.

---

## 2. Pila Tecnológica Real (Tech Stack)

- **Backend y Orquestación:** Python 3.10+, FastAPI, Uvicorn, SQLAlchemy, Pandas, LangChain, LangGraph.
- **Base de Datos y Contenedores:** PostgreSQL 15, Docker, Docker Compose.
- **Frontend y Interfaz:** React.js, Vite, Lucide Icons.
- **Seguridad:** Autenticación basada en JSON Web Tokens (JWT) y cifrado de contraseñas con Passlib (Bcrypt).

---

## 3. Arquitectura y Componentes del Sistema

El sistema opera bajo un esquema de agentes coordinados y servicios integrados:

```text```
[ Usuario / Frontend (React + Vite) ]
                  │
                  ▼
┌────────────────────────────────────────────────────────┐
│         FastAPI Backend & Orquestador Central          │
└────────────┬───────────────────────────────┬───────────┘
             │                               │
             ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  Motor de Conciliación   │    │    Consola Agéntica      │
│  (Pandas / CSV & Excel)  │    │  (LangGraph / Fallback)  │
└────────────┬─────────────┘    └────────────┬─────────────┘
             │                               │
             └───────────────┬───────────────┘
                             │
                             ▼
            ┌─────────────────────────────────┐
            │ PostgreSQL (Usuarios e Invoices)│
            └─────────────────────────────────┘

### 3.1. Backend (FastAPI)

* **Endpoints de Autenticación:** `/api/register` y `/api/login` para la gestión segura de accesos corporativos.
* **Endpoints Protegidos de Administración:** `/api/users` (GET, DELETE) restringidos exclusivamente a usuarios con rol `admin`.
* **Motor de Conciliación Bancaria (`/api/reconcile`):** Procesa de forma automatizada archivos de estado de cuenta en formato CSV o Excel mediante Pandas, cruzando los montos contra las facturas registradas en PostgreSQL.
* **Orquestador Agéntico (`/api/chat`):** Conectado al grafo de estados en LangGraph, con un mecanismo de respaldo (fallback) inteligente hacia la base de datos en caso de no disponer de una clave de LLM externa.

### 3.2. Frontend (React + Vite)

* **Header de Autenticación:** Panel superior interactivo para el inicio de sesión y gestión de tokens JWT con almacenamiento local seguro.
* **Consola Agéntica (`AgentChat.jsx`):** Interfaz conversacional y zona de arrastre para la subida de estados de cuenta.
* **Tablero Financiero (`DataViewer.jsx`):** Visor dinámico que consulta en tiempo real los totales conciliados, montos en riesgo y el estado de las facturas directamente desde la base de datos.

---

## 4. Guía de Ejecución Rápida
1. Levantar servicios de base de datos con Docker: `docker compose up -d`
2. Iniciar el servidor backend en FastAPI: `uvicorn main:app --reload`
3. Iniciar el cliente frontend en React: `npm run dev`