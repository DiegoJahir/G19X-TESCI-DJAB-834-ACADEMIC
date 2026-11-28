# Reporte Técnico de Observaciones, Pendientes y Plan de Mejora

**Proyecto:** Arquitectura Agentic para Finanzas Corporativas  
**Entidad Receptora:** PluriOne S.A. de C.V. (Develop Talent & Technology)  
**Responsable del Desarrollo:** Diego Jahir Almazán Blas  
**Repositorio Institucional:** `DiegoJahir/G19X-TESCI-DJAB-834-ACADEMIC`  
**Fecha de Emisión:** 27 de noviembre de 2026  

---

## 1. Propósito del Documento

El presente documento tiene como finalidad presentar de manera transparente y estructurada las observaciones técnicas pendientes, las incidencias detectadas durante las pruebas funcionales y las mejoras planificadas antes de la entrega final del proyecto ante la asesoría académica y la empresa. Su objetivo es establecer una hoja de ruta clara de cierre técnico y validación.

---

## 2. Hallazgos y Áreas de Mejora Identificadas

### 2.1. Precisión en la Extracción y Conciliación de Documentos PDF
- **Hallazgo:** Durante la validación funcional comparativa entre formatos del mismo conjunto de datos (`Estado De Cuenta 2.csv` y `Estado De Cuenta 2.pdf`), se observó una discrepancia en los montos abonados procesados a partir del archivo PDF (`$200.00 MXN`, `$500.00 MXN` y `$480.00 MXN` frente a `$20,000.00 MXN`, `$5,000.00 MXN` y `$48,000.00 MXN` en CSV), lo que altera el cálculo del indicador de riesgo (`$154,320.00 MXN` en PDF frente a `$82,500.00 MXN` en CSV)[cite: 2, 3].
- **Diagnóstico Técnico:** El mecanismo de extracción de texto o segmentación de valores numéricos para archivos PDF en `POST /api/reconcile` (`backend/main.py`) no interpreta con exactitud la estructura o los separadores de las cifras contenidas en el documento.
- **Acciones Correctivas:**
  - Auditar y ajustar el parser de archivos PDF en `backend/main.py` para garantizar la correcta lectura de importes, fechas y referencias.
  - Incorporar pruebas automatizadas en `backend/tests/test_reconcile_and_agent.py` que validen la paridad de resultados entre entradas en CSV y PDF.

### 2.2. Especificación OpenAPI y Protocolo de Pruebas en Swagger UI (`/docs`)
- **Hallazgo:** La interfaz interactiva de documentación (`http://127.0.0.1:8000/docs`, *PluriOne FinTech API* v0.1.0, OAS 3.1) expone los endpoints y esquemas del servicio, pero aún carece de ejemplos enriquecidos de solicitud/respuesta y de un registro formal de pruebas ejecutadas directamente en la interfaz[cite: 4, 5].
- **Diagnóstico Técnico:** Los endpoints y esquemas Pydantic pueden complementarse con metadatos descriptivos y ejemplos representativos para facilitar la revisión técnica por parte de terceros.
- **Acciones Correctivas:**
  - Documentar descripciones, códigos de estado y ejemplos de carga útil en `backend/main.py` y en los esquemas correspondientes.
  - Ejecutar y documentar un protocolo de pruebas en `/docs` (incluyendo autenticación mediante *Authorize* con token Bearer JWT y validación de los endpoints de facturas, conciliación y chat).

### 2.3. Experiencia de Usuario y Trazabilidad en la Consola Agéntica (`AgentChat.jsx`)
- **Hallazgo:** La consola agéntica opera de forma funcional para la carga de archivos y el envío de mensajes, pero admite mejoras en la claridad interactiva y en la presentación de respuestas analíticas.
- **Diagnóstico Técnico:** Se puede fortalecer la usabilidad del componente `AgentChat.jsx` y la observabilidad de las respuestas generadas mediante LangGraph (`consultar_facturas_postgres` y manejo del modelo local en Ollama).
- **Acciones Correctivas:**
  - Incorporar sugerencias de consulta orientadas a casos financieros frecuentes (consulta por folio, facturas en estado `Parcial` o análisis de saldo en riesgo).
  - Refinar el formato visual de las respuestas del agente y verificar de forma consistente el comportamiento ante disponibilidad o indisponibilidad del modelo configurado.

### 2.4. Gestión y Eliminación de Cuentas de Usuario desde el Frontend
- **Hallazgo:** Aunque el backend contempla la eliminación de usuarios mediante `DELETE /api/users/{user_id}` bajo control de rol `admin`, la interfaz web actual muestra la sesión activa y el cierre de sesión (`Salir`) sin proveer una opción en pantalla para eliminar usuarios o gestionar bajas[cite: 2, 3, 4].
- **Diagnóstico Técnico:** Esta funcionalidad no es bloqueante para el alcance central de conciliación bancaria y análisis de riesgo del MVP, pero conviene definir explícitamente su alcance operativo y de seguridad.
- **Acciones Correctivas:**
  - Determinar con la asesoría y la empresa si se incorporará una vista administrativa de gestión de usuarios (restringida a `admin`) y/o autoeliminación con confirmación explícita, o si se documentará como mejora posterior.

---

## 3. Matriz de Priorización y Estado

| Componente / Rubro | Prioridad | Impacto en Evaluación | Estado Actual | Acción Requerida |
| :--- | :--- | :--- | :--- | :--- |
| Extracción de montos en PDF (`/api/reconcile`) | Alta | Funcional / Integridad de datos | Pendiente de corrección | Ajustar parser PDF y añadir prueba automatizada |
| Documentación y pruebas en `/docs` | Media-Alta | Trazabilidad y validación técnica | Parcial | Enriquecer ejemplos OpenAPI y documentar pruebas |
| Consola Agéntica IA (`AgentChat.jsx`) | Media | Experiencia de usuario y claridad | Operativa / Mejorable | Pulir sugerencias, formato y manejo de respuestas |
| Eliminación de usuario en frontend | Baja | Alcance complementario | No implementado en UI | Definir alcance y, en su caso, implementar con confirmación |

---

## 4. Criterios de Cierre para la Entrega Final

1. Confirmar que un mismo estado de cuenta en formato `.csv`, `.xlsx` y `.pdf` produzca resultados consistentes en el tablero y en PostgreSQL.
2. Verificar la ejecución exitosa de la suite de pruebas (`pytest -v`) y de las pruebas de endpoints en `/docs`.
3. Alinear la documentación técnica (`README.md`, `PRD.md`, `MVP.md`, `USO_IA.md` y `BITACORA_RECUPERACION.md`) con la versión definitiva del código en el repositorio.