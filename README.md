# Proyecto de Desarrollo de una Arquitectura Agentic para Finanzas Corporativas

Sistema agéntico empresarial desarrollado para **PluriOne S.A. de C.V.** enfocado en la automatización de procesos financieros mediante inteligencia artificial, orquestación de agentes, conciliación bancaria y análisis de riesgo en tiempo real.

---

## 🛠️ Pila Tecnológica

- **Backend & Orquestación:** Python, FastAPI, Uvicorn, SQLAlchemy, Pandas, LangChain, LangGraph.
- **Base de Datos & Contenedores:** PostgreSQL, Docker, Docker Compose.
- **Frontend:** React.js, Vite, Lucide Icons.

---

## 🚀 Cómo levantarlo (Instrucciones de Reproducción)

Sigue estos pasos en orden para levantar el proyecto en una máquina limpia:

### 1. Configurar las variables de entorno
Crea un archivo `.env` en la raíz del proyecto basado en la plantilla `.env.example`:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword
POSTGRES_DB=bank_db
DATABASE_URL=postgresql+psycopg://postgres:postgrespassword@localhost:5432/bank_db
SECRET_KEY=clave_secreta_jwt_plurione