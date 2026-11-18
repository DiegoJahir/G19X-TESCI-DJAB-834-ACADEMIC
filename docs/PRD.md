# Product Requirement Document (PRD)

## 1. Información General
- **Nombre del Proyecto:** Proyecto de Desarrollo de una Arquitectura Agentic para Finanzas Corporativas
- **Empresa / Entidad:** PluriOne S.A. de C.V.
- **Autor:** Diego Jahir Almazán Blas
- **Estado:** MVP Operativo / Despliegue en Contenedores Docker

---

## 2. Problema de Negocio
Actualmente, el proceso de conciliación bancaria y análisis de riesgo moratorio en PluriOne S.A. de C.V. implica la revisión manual de estados de cuenta bancarios (`.csv` y `.xlsx`) contra las facturas emitidas por la empresa (`FAC-1021`, `FAC-1022`, `FAC-1023`). Este proceso genera:
- Latencia en la detección de pagos no conciliados.
- Alto riesgo de error humano al cruzar abonos contra cuentas por cobrar.
- Falta de visibilidad consolidada en tiempo real sobre la cartera pendiente o en riesgo.

---

## 3. Objetivos del Sistema
1. **Automatizar la Conciliación:** Procesar archivos CSV y Excel de estados de cuenta mediante Pandas y cruzar abonos contra facturas pendientes en PostgreSQL de manera inmediata.
2. **Alertas de Riesgo en Tiempo Real:** Clasificar de forma automática los montos no liquidados como riesgo moratorio y calcular métricas consolidadas desde la base de datos.
3. **Interfaz Interactiva y Segura:** Proveer una consola web protegida en React para inicio de sesión, carga de archivos, consulta con el asistente agéntico y visualización dinámica de métricas.

---

## 4. Requerimientos Funcionales
- **RF-01 (Autenticación y Control de Acceso):** El sistema debe restringir el acceso a las operaciones financieras y al chat mediante inicio de sesión con tokens JWT y diferenciación de roles (`admin` y `analyst`).
- **RF-02 (Carga de Estados de Cuenta):** El sistema debe permitir subir archivos `.csv`, `.xlsx` y `.xls` con movimientos bancarios (Fecha, Referencia, Concepto, Cargo, Abono, Saldo).
- **RF-03 (Extracción y Motor de Conciliación):** El backend debe extraer la columna de abonos mediante Pandas y realizar el cruce de montos contra el valor de las facturas registradas en PostgreSQL (con tolerancia de redondeo).
- **RF-04 (Evaluación de Riesgo Dinámica):** Toda factura en estado `Pendiente` debe sumar automáticamente al indicador de *Riesgo / Pendiente*, reflejándose al instante en el tablero financiero.
- **RF-05 (Consola Agéntica):** El usuario debe poder consultar el estado financiero mediante lenguaje natural a través de un flujo en LangGraph, contando con un modo de respaldo conectado directamente a PostgreSQL cuando no exista una clave de LLM externa configurada.

---

## 5. Requerimientos No Funcionales
- **RNF-01 (Seguridad & Privacidad):** Las contraseñas deben almacenarse cifradas con Bcrypt y las rutas críticas deben validar tokens JWT. Las credenciales sensibles (`.env`) y datos productivos reales quedan excluidos del repositorio público mediante `.gitignore`, conservando únicamente datasets sintéticos de prueba.
- **RNF-02 (Rendimiento):** El procesamiento en memoria con Pandas y la actualización transaccional en PostgreSQL para estados de cuenta estándar debe ejecutarse en menos de 2 segundos.
- **RNF-03 (Portabilidad y Despliegue):** La infraestructura de base de datos y servicios debe estar contenida mediante Docker y Docker Compose para garantizar su reproducibilidad en entornos locales.