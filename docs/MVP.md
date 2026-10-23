# Definición del MVP y Arquitectura de Agentes Inteligentes

## 1. Alcance del MVP
El Minimum Viable Product (MVP) demuestra el flujo de punta a punta (*end-to-end*) de la arquitectura agéntica financiera. Permite simular el cruce de información bancaria real contra PostgreSQL, desplegando los resultados en el panel frontal de React[cite: 4, 5].

---

## 2. Arquitectura Agéntica Específica

El sistema opera bajo un esquema de **3 agentes coordinados**:

```text
[ Usuario / Frontend ]
          │
          ▼
┌─────────────────────────────────────────┐
│       Agente 0: Orquestador Central     │ (FastAPI / LangGraph)
└────────────────────┬────────────────────┘
                     │
    ┌────────────────┴────────────────┐
    ▼                                 ▼
┌──────────────────────────┐     ┌──────────────────────────┐
│  Agente 1: Lector CSV    │     │ Agente 2: Conciliador    │
│  (Ingesta de Movimientos)│     │  & Analista de Riesgo    │
└──────────────────────────┘     └──────────────────────────┘