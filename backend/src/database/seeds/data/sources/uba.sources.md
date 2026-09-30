# Fuentes — Universidad de Buenos Aires (UBA)

Recortado de `feature/catalog-uba` (commit `ce2fc1f`) a las 3 carreras de
informática/datos que trae esa rama (la rama completa solo trata estas 3; el
resto de UBA —Medicina, Abogacía, etc.— quedó pendiente en la rama origen y
no se toca acá). Investigación original completa:
`git show feature/catalog-uba:backend/src/database/seeds/data/catalog/uba.sources.md`.

Universidad string: `Universidad de Buenos Aires`. Convención de años: el CBC
(Ciclo Básico Común) se representa como filas `year: 1` con `description:
'CBC'`; las materias propias de la carrera arrancan en `year: 2`. Fecha de
consulta: 2026-09-27.

**Cross-check contra `careers/<uni>.json` (C1):** no disponible todavía para
UBA. Nombres de carrera tomados tal cual del `.sources.md` de la rama
`catalog-uba`, que documenta que las 3 ya coinciden con `careers.ts`
("Ciencias de la Computación", "Licenciatura en Ciencia de Datos",
"Ingeniería en Informática").

## Licenciatura en Ciencias de la Computación (FCEN — Departamento de Computación) — 30 materias

- Nombre oficial: coincide exactamente con `careers.ts` ("Ciencias de la
  Computación").
- Plan vigente: **Plan 2023**, aprobado por el Consejo Directivo de FCEN en
  noviembre de 2022 y por el Consejo Superior de la UBA en diciembre de 2022.
- URLs:
  - https://www.dc.uba.ar/carreras/
  - https://computacion.dc.uba.ar/plan-de-estudios-2023/
- 30 materias (6 CBC + 24 de la carrera).

## Licenciatura en Ciencia de Datos (FCEN — Instituto de Cálculo / Deptos. de Computación y Matemática) — 25 materias

- Nombre oficial completo: "Licenciatura en Ciencias de Datos" (plural,
  según dc.uba.ar/carreras y el PDF del plan oficial). **Nota de nombre:**
  `careers.ts` ya tiene cerrada la carrera como `"Licenciatura en Ciencia de
Datos"` (singular). Se mantiene la forma singular ya usada por el resto
  del sistema (registro, perfil, ranking) — la corrección ortográfica del
  enum cerrado queda fuera del alcance de esta tarea.
- Plan vigente: aprobado por expediente EX-2020-01429804-UBA-DMED#SG_FCEN,
  Acta ACS-2020-96-UBA-SG.
- URLs:
  - https://lcd.exactas.uba.ar/ , https://lcd.exactas.uba.ar/materias/
  - PDF oficial: http://lcd.exactas.uba.ar/wp-content/uploads/2022/11/Plan-de-Estudios-Lic.-en-Cs.-Datos.pdf
- 25 materias (6 CBC + 19 del Segundo/Tercer Ciclo).

## Ingeniería en Informática (FIUBA) — 35 materias

- Nombre oficial: coincide exactamente con `careers.ts`.
- Plan vigente: **Plan 2023** (actualización del "Plan 2020" institucional),
  Resolución CD 2023-526.
- URLs:
  - https://www.fi.uba.ar/grado/carreras/ingenieria-en-informatica/plan-de-estudios
  - PDF: https://cms.fi.uba.ar/uploads/RESCD_2023_526_Informatica_Plan_2023_Aprobacion_15d3cee700_6e3b075bd4.pdf
- 35 materias (6 CBC + 24 obligatorias + 4 electivas/optativas + 1 Tesis/
  Trabajo Profesional).

## Fixes aplicados en C2

Ninguno: los nombres de UBA ya usaban numeral romano donde correspondía; no
hay materias terminadas en dígito arábigo standalone en estas 3 carreras.
