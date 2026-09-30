# Fuentes — Universidad Nacional de San Martín (UNSAM)

Recortado de `feature/catalog-unsam` (commit `3880ce5`) a las 4 carreras de
informática/datos incluidas en `official-subjects.ts` (tarea C2), de las 9
que trae la rama completa. Investigación original completa:
`git show feature/catalog-unsam:backend/src/database/seeds/data/catalog/unsam.sources.md`.

Universidad string: `Universidad Nacional de San Martín`. Todas dictadas por
la Escuela de Ciencia y Tecnología (ECyT), sede Campus Miguelete. Fecha de
consulta: 2026-09-26 (investigación) / 2026-09-27 (cierre de la rama origen).

**Cross-check contra `careers/unsam.json` (C1, rama `feature/careers-catalog-a`):**
las 4 carreras **coinciden exactamente**: "Licenciatura en Desarrollo de
Software", "Tecnicatura Universitaria en Programación Informática",
"Tecnicatura Universitaria en Redes Informáticas", "Licenciatura en Ciencia
de Datos". Sin renombres.

## Licenciatura en Desarrollo de Software (carrera nueva) — 34 materias

- URL: https://www.unsam.edu.ar/escuelas/ecyt/775/ecyt/desarrollo-software
- Resolución S.E - MSH 1107/24.
- Duración: 4 años (8 cuatrimestres, 2784 horas). 34 materias, incluye 4
  "Proyecto Integrador I-IV" anuales.
- No estaba en el catálogo previo. Agregar a `careers.ts`.

## Tecnicatura Universitaria en Programación Informática (carrera nueva) — 18 materias

- URL: https://www.unsam.edu.ar/escuelas/ecyt/107/ciencia/programacion-informatica
- Resolución Ministerial Nº 0299/06.
- Duración: 3 años (6 cuatrimestres, 2112 horas). 18 materias. Comparte los
  primeros 3 cuatrimestres ("Ciclo común para ambas Carreras TPI/TRI") con
  la Tecnicatura en Redes Informáticas.
- El sitio oficial titula la carrera "Tecnicatura Universitario en..." (sin
  concordancia de género); se normalizó a "Tecnicatura Universitaria en
  Programación Informática".
- No estaba en el catálogo previo. Agregar a `careers.ts`.

## Tecnicatura Universitaria en Redes Informáticas (carrera nueva) — 18 materias

- URL: https://www.unsam.edu.ar/escuelas/ecyt/109/ciencia/redes-informaticas
- Resolución Ministerial Nº 0377/06.
- Duración: 3 años (6 cuatrimestres, 2112 horas). 18 materias, mismo ciclo
  común que la tecnicatura de Programación Informática.
- No estaba en el catálogo previo. Agregar a `careers.ts`.

## Licenciatura en Ciencia de Datos — 24 materias

- URL: https://www.unsam.edu.ar/escuelas/ecyt/661/ciencia/ciencia-de-datos
- Resolución Ministerial RM 3079/21.
- Duración: 4 años (8 cuatrimestres). 24 materias (incluye 3 electivas y 3
  optativas, una fila por cupo).
- Ya existía en el catálogo previo (fabricada); se reemplazó completo.

## Fixes aplicados en C2

En **Licenciatura en Ciencia de Datos**, siguiendo la instrucción explícita
del plan de la tarea C2, se corrigieron a numeral romano los nombres que la
rama original dejó en arábigo (mismatch entre el nombre real del plan, que
usa numeral romano, y el catálogo original):

| Nombre en `catalog-unsam` | Nombre corregido |
| ------------------------- | ---------------- |
| Análisis 1                | Análisis I       |
| Programación 1            | Programación I   |
| Análisis 2                | Análisis II      |
| Electiva 1                | Electiva I       |
| Programación 2            | Programación II  |
| Electiva 2                | Electiva II      |
| Electiva 3                | Electiva III     |
| Optativa 1                | Optativa I       |
| Optativa 2                | Optativa II      |
| Optativa 3                | Optativa III     |

Se descartó la reasignación posicional de códigos que la rama `catalog-unsam`
había hecho contra los códigos viejos del seed (`UNSAMCD01-12` reutilizados
por posición, no por materia verificada): las filas de `official-subjects.ts`
mantienen los códigos propios de la rama tal cual (`source='official'` en el
modelo de datos de R1), sin ninguna relación con los códigos del seed viejo.
