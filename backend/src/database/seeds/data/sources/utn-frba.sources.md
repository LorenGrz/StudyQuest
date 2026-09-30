# Fuentes — Universidad Tecnológica Nacional – FRBA

Recortado de `feature/catalog-utn-frba` (commit `ec2203a`) a las 2 carreras de
informática/programación incluidas en `official-subjects.ts` (tarea C2), de
las 6 que trae la rama completa (Industrial, Electrónica, Mecánica y Química
quedan fuera). Investigación original completa:
`git show feature/catalog-utn-frba:backend/src/database/seeds/data/catalog/utn-frba.sources.md`.

Universidad string: `Universidad Tecnológica Nacional – FRBA` (con guion en
dash, U+2013). Fecha de consulta: 2026-09-27.

**Cross-check contra `careers/utn-frba.json` (C1, rama `feature/careers-catalog-a`):**
las 2 carreras **coinciden exactamente**: "Ingeniería en Sistemas de
Información", "Tecnicatura Universitaria en Programación". Sin renombres.

## Ingeniería en Sistemas de Información — Plan 2023 — 44 materias

- Nombre oficial: **Ingeniería en Sistemas de Información** (coincide con
  `backend/src/common/careers.ts`).
- Fuentes:
  - `https://www.frba.utn.edu.ar/sistemas/disenio-curricular/`
  - `https://www.frba.utn.edu.ar/sistemas/plan-de-estudios-2023/` (confirma
    Ordenanza 1877 vigente para ingresantes desde 2023)
  - `https://www.frba.utn.edu.ar/wp-content/uploads/2022/12/Ordenanza-1877-Plan-ISI2023.pdf`
- Fecha de consulta: 2026-09-27.
- Cantidad de materias: 44 filas (36 obligatorias + 1 Práctica Profesional
  Supervisada + 7 slots de electivas). El catálogo de electivas concretas no
  se expande.

## Tecnicatura Universitaria en Programación — 18 materias

- Nombre oficial: **Tecnicatura Universitaria en Programación**. No está en
  `backend/src/common/careers.ts` (carrera nueva).
- Fuente: `https://sceu.frba.utn.edu.ar/e-learning/detalle/carrera/3906/tecnicatura-universitaria-en-programacion`
  (portal de la Secretaría de Cultura y Extensión Universitaria de UTN FRBA;
  la tecnicatura depende de la SCEU, no del Departamento de Sistemas).
- Fecha de consulta: 2026-09-27.
- Cantidad de materias: 18 (4 + 4 + 4 + 6 por cuatrimestre), sin electivas
  declaradas.

## Fixes aplicados en C2

Ninguno: los nombres de UTN FRBA ya usaban numeral romano donde
correspondía ("Análisis Matemático I", "Física I", etc.); no hay materias
terminadas en dígito arábigo standalone en estas 2 carreras.
