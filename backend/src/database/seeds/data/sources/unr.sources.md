# Fuentes — Universidad Nacional de Rosario (UNR)

Recortado de `feature/catalog-unr` (commit `cc29a34`) — la rama completa solo
trae estas 3 carreras de informática/datos, todas incluidas en
`official-subjects.ts` (tarea C2). Investigación original completa:
`git show feature/catalog-unr:backend/src/database/seeds/data/catalog/unr.sources.md`.

Universidad string: `Universidad Nacional de Rosario`. Fecha de consulta:
2026-09-27.

**Cross-check contra `careers/unr.json` (C1, rama `feature/careers-catalog-b`):**

- "Licenciatura en Ciencias de la Computación" → coincide, pero **se
  renombró**: la rama `catalog-unr` había usado la forma corta "Ciencias de
  la Computación" (mismo criterio que UBA, para coincidir con el enum
  cerrado `careers.ts`); `careers/unr.json` (C1) usa la forma completa
  "Licenciatura en Ciencias de la Computación", que es la que se usó en
  `official-subjects.ts` por instrucción explícita de la tarea C2 (preferir
  el nombre exacto del JSON de careers cuando existe).
- "Licenciatura en Ciencia de Datos" → coincide exactamente.
- "Tecnicatura Universitaria en Inteligencia Artificial" → coincide
  exactamente.

## Licenciatura en Ciencias de la Computación (FCEIA) — 33 materias

- Plan vigente: Plan 2023, Resolución CD FCEIA N.º 850/2023.
- URLs:
  - https://web.fceia.unr.edu.ar/es/licenciatura-en-ciencias-de-la-computaci%C3%B3n.html
  - PDF: https://web.fceia.unr.edu.ar/images/PDF/planes_de_estudio/Plan_LCC_CD_41043_2023_2.pdf
- **NO verificado por herramientas de texto**: el PDF es un documento
  escaneado (fotocopiadora, sin capa de texto); se extrajo el contenido
  renderizando cada página a imagen con `pdftoppm` y leyéndolas
  directamente, no con extracción de texto automática.
- 33 filas (28 obligatorias + Práctica Profesional + Taller de Tesina +
  Tesina + 2 "Materia Electiva").

## Licenciatura en Ciencia de Datos (FCEyE) — 35 materias

- Plan vigente: Plan de Estudios 2024, Resolución CS UNR N.º 603/2024.
- URLs:
  - https://portal.fcecon.unr.edu.ar/carreras/grado/licenciatura-en-ciencia-de-datos
  - PDF del plan (Google Drive): https://drive.google.com/file/d/1KG8hdhUXum9sYSbiaYCX0h5rs4GCa1bF/view
- **NO verificado por herramientas de texto**: la fuente principal del plan
  es un PDF alojado en Google Drive, sin extracción automatizada confiable
  disponible en esta tarea (ver también HANDOFF.md, tabla "Catálogos
  investigados").
- 35 filas (28 obligatorias + 5 optativas concretas del espacio E4.1.27 +
  2 "Asignatura Electiva").

## Tecnicatura Universitaria en Inteligencia Artificial (FCEIA) — 26 materias

- Plan vigente: creación por Resolución CD FCEIA N.º 555/2021.
- URLs:
  - http://web.fceia.unr.edu.ar/es/carreras/carreras-de-pregrado/2165-tecnicatura-universitaria-en-inteligencia-artificial.html
  - PDF de la grilla (con capa de texto): http://web.fceia.unr.edu.ar/images/PDF/planes_de_estudio/Pregrado/Tecnicatura_universitaria_en_inteligencia_artificial/grilla_plan_de_estudio_tecnicatura_universitaria_inteligencia_artificial_1.pdf
- Verificado 4/4 contra fuente en texto (grilla con capa de texto).
- 26 filas (24 obligatorias + 1 "Espacio Electivo").

## Fixes aplicados en C2

Ninguno. **Licenciatura en Ciencia de Datos** numera varias materias con
dígito arábigo standalone en el plan oficial ("Laboratorio de Datos 1/2",
"Estadística 1/2", "Programación 1/2", "Análisis Matemático 1/2",
"Aprendizaje Estadístico 1/2"); se mantuvo esa ortografía tal cual. Un primer
borrador de esta tarea había normalizado estos nombres a numeral romano por
consistencia con el resto del catálogo; se revirtió: la ortografía oficial
tiene prioridad sobre la consistencia visual, y el normalizador de dedupe
(`normalizeSubjectName`, tanto en el validador local como en
`common/subject-name.ts` de R1) ya trata arábigo y romano como equivalentes,
así que no hace falta para evitar duplicados.
