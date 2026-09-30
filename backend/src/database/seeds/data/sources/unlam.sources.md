# Fuentes — Universidad Nacional de La Matanza (UNLaM)

Recortado de `feature/catalog-unlam` (commit `7a00d49`) a las 3 carreras de
informática incluidas en `official-subjects.ts` (tarea C2). Investigación
original completa: `git show feature/catalog-unlam:backend/src/database/seeds/data/catalog/unlam.sources.md`.

Universidad string: `Universidad Nacional de La Matanza`. Todas las carreras
pertenecen al Departamento de Ingeniería e Investigaciones Tecnológicas (DIIT),
sitio `https://ingenieria.unlam.edu.ar/`. Fecha de consulta de todas las
fuentes: **2026-09-26**.

**Cross-check contra `careers/unlam.json` (C1, rama `feature/careers-catalog-a`):**
las 3 carreras **coinciden exactamente** (nombre y facultad "Ingeniería"):
"Ingeniería en Informática", "Tecnicatura Universitaria en Web",
"Tecnicatura en Desarrollo de Aplicaciones Móviles". Sin renombres.

## Ingeniería en Informática (plan 2023) — 57 materias

- Nombre oficial exacto: **Ingeniería Informática** en la portada de la
  carrera; título otorgado: _Ingeniero en Informática_ (5 años). Título
  intermedio: _Técnico Universitario en Desarrollo de Software_ (no se
  catalogó como carrera aparte: no tiene inscripción propia, ver rama
  original).
- URLs:
  - Ficha de carrera: `https://ingenieria.unlam.edu.ar/index.php?seccion=3&idArticulo=10`
  - Plan de estudio 2023 (texto): `https://ingenieria.unlam.edu.ar/index.php?seccion=3&idArticulo=565`
  - Mapa de correlatividades (PDF, fuente real de las 57 materias con código
    y año/cuatrimestre): `https://ingenieria.unlam.edu.ar/descargas/10_MapaInformatica.pdf`
- Plan: **2023**. 57 materias (`ULMINF01`..`ULMINF57`).
- Notas / posibles erratas del material oficial (no de esta transcripción):
  - Código 3640: el PDF oficial imprime "Algoritmos y Estucturas de Datos"
    (falta la "r"), transcripto tal cual, confirmado visualmente.
  - Código 3641: "Bases de Datos Aplicada" (singular), confirmado visualmente.
  - "Proyecto Final de Carrera" figura con el código "3071" en el mapa
    (rompe la secuencia 3668-3675 de ese año).

## Tecnicatura Universitaria en Web — 20 materias

- Nombre oficial exacto: **Tecnicatura Universitaria en Web**. Nueva en
  `CAREERS` (no está todavía en el enum cerrado del backend).
- URLs:
  - Ficha de carrera: `https://ingenieria.unlam.edu.ar/index.php?seccion=3&idArticulo=18`
  - Plan de estudio (tabla HTML completa): `https://ingenieria.unlam.edu.ar/index.php?seccion=3&idArticulo=36`
- 20 materias (`ULMWEB01`..`ULMWEB20`), códigos oficiales 2619-2638.

## Tecnicatura en Desarrollo de Aplicaciones Móviles — 20 materias

- Nombre oficial exacto: **Tecnicatura en Desarrollo de Aplicaciones
  Móviles**. Nueva en `CAREERS`.
- URLs:
  - Ficha de carrera: `https://ingenieria.unlam.edu.ar/index.php?seccion=3&idArticulo=367`
  - Plan de estudio (tabla HTML completa): `https://ingenieria.unlam.edu.ar/index.php?seccion=3&idArticulo=368`
- 20 materias (`ULMMOV01`..`ULMMOV20`), códigos oficiales 2996-3015.

## Fixes aplicados en C2

Ninguno: los nombres de UNLaM ya usaban numeral romano donde correspondía
("Análisis Matemático I", "Física I", etc.); no hay materias terminadas en
dígito arábigo standalone en estas 3 carreras.
