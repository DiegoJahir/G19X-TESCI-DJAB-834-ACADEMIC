# Product Requirement Document (PRD)

## 1. Información General
 - **Nombre del Proyecto**: Proyecto de Desarrollo de una Arquitectura Agentic para Finanzas Corporativas
 - **Empresa / Entidad**: PluriOne S.A. de C.V.
 - **Autor**: Diego Jahir Almazán Blas
 - **Estado**: MVP Operativo / Despliegue en Contenedores Docker

---

## 2. Problema de Negocio
El proceso manual de conciliación bancaria y seguimiento de cuentas por cobrar frente a las facturas emitidas (`FAC-1021`, `FAC-1022`, `FAC-1023`) genera:
 - Retrasos en la identificación de pagos completos, abonos parciales, pagos fraccionados secuenciales, duplicados y movimientos sin identificar.
 - Riesgo de error humano al comparar montos de estados de cuenta contra facturas registradas.
 - Falta de visibilidad consolidada sobre el monto conciliado, el historial por archivo analizado y el saldo pendiente o en riesgo.

---

## 3. Objetivos del Sistema
 - **Automatizar la Conciliación**: Procesar estados de cuenta en CSV, Excel (`.xlsx`, `.xls`) y PDF mediante Pandas y `pypdf`, cruzando abonos contra facturas en PostgreSQL y respaldando pruebas con el conjunto de ejemplos en `Estados De Cuentas/`.
 - **Control de Abonos Parciales y Riesgo**: Distinguir entre facturas conciliadas (`Conciliado`), con abono parcial (`Parcial`) o pendientes (`Pendiente`), calculando `paid_amount`, `pending_balance` y el monto en riesgo desde la base de datos.
 - **Asistente Agéntico y Tablero Seguro**: Ofrecer autenticación con JWT y control de roles, tablero sincronizado con PostgreSQL (con historial de conciliaciones, exportación de reporte CSV y reseteo de pruebas coordinado con la consola agéntica) y chat conectado a un grafo de LangGraph con herramienta de consulta a PostgreSQL.

---

## 4. Requerimientos Funcionales
 - **RF-01 (Autenticación y Control de Acceso)**: Restringir el acceso a facturas, conciliación y chat mediante JWT (`OAuth2PasswordBearer`) y validar el rol `admin` en endpoints de administración de usuarios (`/api/users`), así como roles autorizados (`admin` / `analyst`) para el reseteo de pruebas.
 - **RF-02 (Carga de Estados de Cuenta)**: Permitir subir archivos `.csv`, `.xlsx`, `.xls` y `.pdf` con movimientos bancarios para su extracción y cruce, contando con ejemplos listos en `Estados De Cuentas/` (`Estado De Cuenta 1` a `5` en `.csv`, `.xlsx` y `.pdf`) y `estado_cuenta_ejemplo.csv`.
 - **RF-03 (Motor de Conciliación y Prevención de Duplicados)**: Emparejar montos contra facturas en PostgreSQL evitando reutilizar el mismo movimiento en múltiples facturas, detectando pagos duplicados o sin factura e informando abonos no conciliados (`unmatched_abonos` y `unmatched_details`).
 - **RF-04 (Abonos Parciales, Riesgo Dinámico y Reset de Pruebas)**: Registrar `paid_amount` y calcular `pending_balance` (`amount - paid_amount`). Un abono parcial marca la factura como `Parcial`, no la contabiliza como conciliada completa y suma únicamente su saldo pendiente al indicador de riesgo. Asimismo, permitir resetear el estado de las facturas en PostgreSQL (`/api/invoices/reset`), limpiando el historial del tablero y reiniciando la consola agéntica a su mensaje inicial.
 - **RF-05 (Consola Agéntica con Herramienta PostgreSQL)**: Consultar facturas en PostgreSQL mediante la herramienta `consultar_facturas_postgres` dentro de un grafo de LangGraph (`StateGraph`, `ToolNode`, `MemorySaver`). Si el modelo no está disponible o falla su invocación, devolver el mensaje claro de no disponibilidad sin respuestas inventadas.

---

## 5. Requerimientos No Funcionales
 - **RNF-01 (Seguridad y Privacidad)**: Cifrar contraseñas con Bcrypt, leer secretos y credenciales desde variables de entorno (`.env`), mantener `.env.example` sin valores reales ni secretos en el repositorio y excluir datos sensibles en `.gitignore` permitiendo explícitamente los archivos de ejemplo en `Estados De Cuentas/`.
 - **RNF-02 (Portabilidad y Despliegue)**: Levantar la base de datos PostgreSQL mediante Docker Compose y ejecutar el backend en FastAPI y el frontend en React con Vite.
 - **RNF-03 (Trazabilidad y Pruebas)**: Contar con pruebas automatizadas (`pytest`) para los escenarios de conciliación (pago completo, parcial e inexistente) y para la herramienta de consulta del agente, además de exportación de reporte CSV desde el tablero.

---

## 6. Trabajo Futuro
 - Caché y colas en memoria o mensajería con **Redis**.
 - Búsqueda semántica o recuperación documental empresarial con **Azure AI Search**.
 - Orquestación multi-agente especializada (por ejemplo, agentes dedicados a conciliación, riesgo crediticio y tesorería) y reportes automatizados avanzados.