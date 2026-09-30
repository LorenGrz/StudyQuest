# Fuentes — Universidad Nacional de La Plata (UNLP)

Recortado de `feature/catalog-unlp` (commit `6260ae8`) a las 6 carreras de
informática/datos incluidas en `official-subjects.ts` (tarea C2), de las 9
que trae la rama completa (Abogacía, Contador Público y Medicina Veterinaria
quedan fuera). Investigación original completa:
`git show feature/catalog-unlp:backend/src/database/seeds/data/catalog/unlp.sources.md`.

Universidad string: `Universidad Nacional de La Plata`. Fecha de consulta:
2026-09-27.

**Cross-check contra `careers/unlp.json` (C1, rama `feature/careers-catalog-b`):**
las 6 carreras **coinciden exactamente** (nombre y facultad "Facultad de
Informática"):

- "Licenciatura en Informática"
- "Licenciatura en Sistemas"
- "Analista Programador Universitario"
- "Analista en Tecnologías de la Información y la Comunicación"
- "Ingeniería en Computación"
- "Ciencia de Datos en Organizaciones"

## Licenciatura en Informática (Facultad de Informática) — 37 materias

- URL: https://www.info.unlp.edu.ar/carreras-de-grado-lic-en-informatica/
- Plan vigente: Plan 2021 — https://www.info.unlp.edu.ar/licenciatura-en-informatica-plan-2021/
- 37 asignaturas (cifra confirmada por el propio sitio). Incluye 3 cursos de
  nivelación (`year: 1`) y 1 fila de electiva ("Optativa I", cupo "Optativa
  1 LI").

## Licenciatura en Sistemas (Facultad de Informática) — 37 materias

- URL: https://www.info.unlp.edu.ar/licenciatura-en-sistemas/
- Plan vigente: Plan 2021 — https://www.info.unlp.edu.ar/licenciatura-en-sistemas-plan-2021/
- 37 asignaturas. Comparte ~90% del plan con Licenciatura en Informática;
  diverge desde el 6to semestre. 2 filas de electiva ("Optativa I"/"Optativa
  II").

## Analista Programador Universitario (Facultad de Informática) — 24 materias

- URL: https://www.info.unlp.edu.ar/analista-programador-universitario/
- Plan vigente: Plan 2021 — https://www.info.unlp.edu.ar/analista-programador-universitario-plan-2021/
- 24 asignaturas. El bloque "ELEGIR UNA ASIGNATURA DE LAS SIGUIENTES" se
  modeló como una única fila electiva ("Optativa Técnica APU").

## Analista en Tecnologías de la Información y la Comunicación (Facultad de Informática) — 24 materias

- URL: https://www.info.unlp.edu.ar/analista-en-tic/
- Plan vigente: Plan 2021 — https://www.info.unlp.edu.ar/analista-en-tecnologias-de-la-informacion-y-la-comunicacion-plan-2021/
- 24 asignaturas. El bloque de 2 optativas por orientación se modeló como
  2 filas electivas ("Optativa de Orientación I/II").

## Ingeniería en Computación (Facultad de Informática / Facultad de Ingeniería) — 46 materias

- URL: https://ic.info.unlp.edu.ar/
- Plan vigente: Plan de Estudio 2024 — https://ic.info.unlp.edu.ar/plan-de-estudio-2024/
- Acreditada por 6 años, RESFC-2017-346-APN-CONEAU#ME.
- 46 filas: incluye 4 "Actividades de Formación Complementaria I-IV", 2
  optativas, 1 electiva humanística, PPS y prueba de inglés.

## Ciencia de Datos en Organizaciones (Facultad de Informática / Facultad de Ciencias Económicas) — 29 materias

- URL: https://cdo.info.unlp.edu.ar/carrera/
- Plan vigente: Plan de Estudio 2024 — https://cdo.info.unlp.edu.ar/plan-de-estudio-2024/
- 29 filas = 26 obligatorias + 1 optativa + PPS + prueba de inglés.
- No se encontró una denominación de título distinta a "Ciencia de Datos en
  Organizaciones" (ni "Licenciado/a en...", ni "Analista...").

## Fixes aplicados en C2

El plan oficial real de la Facultad de Informática numera varias materias
con dígito arábigo standalone (confirmado explícitamente en la rama origen,
p. ej. "Ingeniería de Software 1" es el nombre real, no una errata). Para
mantener consistencia de estilo con el resto del catálogo y satisfacer el
validador de C2 (que rechaza nombres terminados en dígito arábigo 1-10), se
corrigieron a numeral romano en las 6 carreras:

| Nombre real del plan (arábigo) | Nombre en `official-subjects.ts` (romano) |
| ------------------------------ | ----------------------------------------- |
| Matemática 1                   | Matemática I                              |
| Matemática 2                   | Matemática II                             |
| Matemática 3                   | Matemática III                            |
| Matemática 4                   | Matemática IV                             |
| Ingeniería de Software 1       | Ingeniería de Software I                  |
| Ingeniería de Software 2       | Ingeniería de Software II                 |
| Ingeniería de Software 3       | Ingeniería de Software III                |
| Orientación a Objetos 1        | Orientación a Objetos I                   |
| Orientación a Objetos 2        | Orientación a Objetos II                  |
| Bases de Datos 1               | Bases de Datos I                          |
| Bases de Datos 2               | Bases de Datos II                         |
| Redes de Datos 1               | Redes de Datos I                          |
| Optativa 1                     | Optativa I                                |
| Optativa 2                     | Optativa II                               |

**"Matemática 0" (curso de nivelación) no se tocó**: 0 está fuera del rango
1-10 del validador y no tiene numeral romano; se mantuvo tal cual figura en
el plan oficial.

Esta es una **desviación intencional** del nombre exacto del plan oficial de
UNLP (que sí usa arábigo) — ver nota completa en el header de
`official-subjects.ts` y el reporte de la tarea C2.
