# Proyecto de Desarrollo de una Arquitectura Agentic para Finanzas Corporativas

Sistema agéntico empresarial desarrollado para **PluriOne S.A. de C.V.** enfocado en la automatización de procesos financieros mediante inteligencia artificial, orquestación de agentes, conciliación bancaria y análisis de riesgo en tiempo real.

---

## 🛠️ Pila Tecnológica

* **Backend & Orquestación:** Python, FastAPI, Uvicorn, LangChain, LangGraph.
* **Base de Datos & Caché:** PostgreSQL, Redis, Docker, Docker Compose.
* **Frontend:** React.js, Vite, TailwindCSS / Lucide Icons.
* **DevOps & Cloud:** GitHub Actions (CI/CD), Azure OpenAI Service (`.env.example`), Azure AI Search.

---

## 📁 Estructura del Proyecto

```text
├── backend/                  # API en FastAPI y lógica agéntica (Python)
├── frontend/                 # Interfaz de usuario interactiva (React + Vite)
├── docs/                     # Documentación técnica del proyecto
│   ├── PRD.md                # Product Requirement Document (Requerimientos)
│   └── MVP.md                # Definición de Agentes y alcance del MVP
├── schema.sql                # Script DDL de PostgreSQL para la base de datos
├── docker-compose.yml        # Configuración de servicios PostgreSQL y Redis
├── .env.example              # Plantilla de variables de entorno sin claves reales
└── .gitignore                # Reglas de exclusión de git (protección de datos)