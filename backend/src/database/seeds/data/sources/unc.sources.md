# Fuentes — Universidad Nacional de Córdoba (UNC)

Recortado de `feature/catalog-unc` (commit `8de60db`) a las 3 carreras de
informática incluidas en `official-subjects.ts` (tarea C2), de las 7 que
trae la rama completa (Ingeniería Civil, Ingeniería Mecánica, Licenciatura
en Química y Contador Público quedan fuera). Investigación original
completa: `git show feature/catalog-unc:backend/src/database/seeds/data/catalog/unc.sources.md`.

Universidad string: `Universidad Nacional de Córdoba`. Fecha de consulta:
2026-09-27.

**Cross-check contra `careers/unc.json` (C1, rama `feature/careers-catalog-b`):**

- "Licenciatura en Ciencias de la Computación" → **coincide** exactamente
  (facultad "Facultad de Matemática, Astronomía, Física y Computación").
- "Ingeniería en Computación" → **coincide** exactamente (facultad "Facultad
  de Ciencias Exactas, Físicas y Naturales").
- "Analista en Computación" → **no está** en `careers/unc.json` (el JSON de
  C1 no lista esta carrera de título intermedio). Cross-check gap: reportado
  en la tarea C2. Se mantuvo el nombre oficial verificado en la propia rama
  `catalog-unc` (la página de FAMAF usa textualmente "Analista en
  Computación").

## Licenciatura en Ciencias de la Computación (FAMAF) — 27 materias

- URL: https://www.famaf.unc.edu.ar/academica/grado/licenciatura-en-ciencias-de-la-computaci%C3%B3n/
- Plan de estudios (PDF de correlatividades, "LCC (638) Plan 2002",
  actualizado 01/09/2021): https://www.famaf.unc.edu.ar/documents/6056/LCC_638.pdf
- Duración: 5 años. 27 filas (incluye Curso de Nivelación, Optativas como un
  único cupo y Trabajo Especial/tesina).

## Analista en Computación (FAMAF) — 19 materias

- URL: https://www.famaf.unc.edu.ar/academica/grado/analista-en-computaci%C3%B3n/
- Sin plan propio publicado: la página oficial declara textualmente "El plan
  de estudios de la carrera Analista en Computación corresponde a los tres
  primeros años de la Licenciatura en [Ciencias de la] Computación". Se
  modeló como las 19 materias de los años 1-3 del plan de la Licenciatura
  (mismos nombres oficiales), con códigos propios (`UNCANC`).
- Duración: 3 años. 19 filas.
- **No cruzado contra `careers/unc.json`** (ver nota de cross-check arriba).

## Ingeniería en Computación (FCEFyN) — 42 materias

- URL: https://fcefyn.unc.edu.ar/facultad/secretarias/academica/escuelas/ingenieria-computacion/carrera-ingenieria-en-computacion/
- Plan de estudios 2025 (ingreso 2025, aprobado por el Honorable Consejo
  Superior el 11/06/2024):
  https://fcefyn.unc.edu.ar/facultad/secretarias/academica/escuelas/ingenieria-computacion/carrera-ingenieria-en-computacion/plan-de-estudios-2025-/
- Duración: 5 años. 42 materias (incluye Nivelación de 3 materias y 2 cupos
  "Selectiva 1"/"Selectiva 2" sin nombre fijo en el plan oficial). La página
  oficial confirma "reducción de 48 a 42 asignaturas" respecto del plan
  anterior.

## Fixes aplicados en C2

Ninguno. **Ingeniería en Computación** numera varias materias con dígito
arábigo standalone en el plan oficial real ("Análisis Matemático 1/2/3",
"Física 1/2", "Electrónica Digital 1/2/3", "Sistemas de Control 1/2",
"Selectiva 1/2"); se mantuvo esa ortografía tal cual la escribe el plan
oficial (confirmado en la rama origen). Un primer borrador de esta tarea
había normalizado estos nombres a numeral romano por consistencia con el
resto del catálogo; se revirtió: la ortografía oficial tiene prioridad sobre
la consistencia visual, y el normalizador de dedupe (`normalizeSubjectName`,
tanto en el validador local como en `common/subject-name.ts` de R1) ya trata
arábigo y romano como equivalentes, así que no hace falta para evitar
duplicados.
