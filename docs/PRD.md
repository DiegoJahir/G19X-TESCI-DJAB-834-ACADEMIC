```markdown
# Product Requirement Document (PRD)

## 1. Información General
* **Nombre del Proyecto:** Proyecto de Desarrollo de una Arquitectura Agentic para Finanzas Corporativas
* **Empresa / Entidad:** PluriOne S.A. de C.V.
* **Autor:** Diego Jahir
* **Estado:** MVP Operativo / Fase de Despliegue de Infraestructura

---

## 2. Problema de Negocio
Actualmente, el proceso de conciliación bancaria y análisis de riesgo moratorio en PluriOne S.A. de C.V. implica la revisión manual de estados de cuenta bancarios (`.csv`) contra las facturas emitidas por la empresa (`FAC-1021`, `FAC-1022`, etc.). Este proceso genera:
* Latencia en la detección de pagos no conciliados.
* Alto riesgo de error humano al identificar abonos parciales o montos imprevistos.
* Falta de visibilidad consolidada en tiempo real sobre la cartera vencida o faltante por cobrar.

---

## 3. Objetivos del Sistema
1. **Automatizar la Conciliación:** Procesar archivos CSV de estados de cuenta y cruzar abonos contra facturas pendientes en PostgreSQL de manera inmediata.
2. **Alertas de Riesgo en Tiempo Real:** Clasificar de forma automática los montos no liquidados como riesgo moratorio y calcular métricas globales ($155,500 MXN en riesgo base).
3. **Interfaz Interactiva:** Proveer una consola web intuitiva en React para carga de archivos, chat con el orquestador agéntico y visualización de métricas.

---

## 4. Requerimientos Funcionales
* **RF-01 (Carga de Estados de Cuenta):** El sistema debe permitir subir archivos `.csv` con movimientos bancarios (Fecha, Referencia, Concepto, Cargo, Abono, Saldo).
* **RF-02 (Extracción y Filtro):** El agente de procesamiento debe aislar las entradas positivas (Abonos) e ignorar cargos administrativos (renta, comisiones, servicios).
* **RF-03 (Motor de Matching/Conciliación):** El sistema debe realizar la coincidencia exacta de montos abonados contra el valor total de las facturas registradas en la base de datos.
* **RF-04 (Evaluación de Riesgo):** Toda factura en estado `PENDIENTE` o con abono parcial debe sumar automáticamente al indicador de *Riesgo Moratorio*.
* **RF-05 (Consola de Chat):** El usuario debe poder consultar el estado del flujo mediante lenguaje natural interaccionando con el orquestador.

---

## 5. Requerimientos No Funcionales
* **RNF-01 (Seguridad & Privacidad):** Ningún archivo `.csv` con datos financieros ni credenciales locales `.env` debe almacenarse en el repositorio público de Git.
* **RNF-02 (Rendimiento):** El tiempo de procesamiento y cálculo de conciliación para un estado de cuenta de hasta 1,000 filas debe ser inferior a 2 segundos mediante almacenamiento en caché (Redis).
* **RNF-03 (Escalabilidad):** La arquitectura backend basada en FastAPI y Docker debe permitir el despliegue desacoplado de microservicios y conectores para Azure OpenAI Service.