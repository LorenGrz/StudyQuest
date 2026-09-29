# StudyQuest — catálogo de carreras oficial + materias de la comunidad

## Context

Mantener planes de estudio materia por materia de muchas universidades no es sostenible: cambian seguido y hay anti-bots.

**Nuevo modelo (decisiones de Loren):**
- **Universidades y carreras** = catálogo oficial, curado y versionado en el repo.
  - Se revisa **cada 3 meses** con una rutina de Claude que abre un PR; Loren lo aprueba y un script lo aplica en prod.
  - Si la carrera de un alumno no está, elige **"Otra"**: crea un pedido **pendiente hasta que un admin lo aprueba**.
- **Materias:**
  - Se siembran **solo las de informática/sistemas**, ya investigadas y verificadas (~650 materias).
  - El resto lo **crean los alumnos**: cada uno carga las que cursa. Una materia nueva es **privada para su creador** hasta que gana confianza.
  - Toda materia creada tiene que ser **real y tangible**, sin insultos ni texto basura. Se valida en 3 capas (ver R2).

**Estado de partida:**
- `subjects` es texto libre: `university`, `career`, `code` único por universidad. `POST /subjects` lo puede usar cualquier usuario logueado, sin dedup.
- `CAREERS` es una constante cerrada (`common/careers.ts`) que valida registro y perfil.
- El explorer filtra solo por carrera, no por universidad.
- `unenrollSubject` puede dejar `enrolledCount` negativo.
- Prod tiene 487 materias sembradas **inventadas** por el seed viejo.
- Las FKs a `subjects` son `RESTRICT` desde parties y quests y `CASCADE` desde `skill_nodes` y `user_subjects`.
- `pg_trgm` y `unaccent` se crean al boot (`main.ts:66`) y en `docker/postgres/init.sql`. No tienen migración ni índice GIN.
- Hay catálogos verificados en ramas `feature/catalog-*`: UNLaM, UNSAM, UTN FRBA, UBA (informática), UNC, UNLP y UNR. La 2ª pasada de UBA quedó cortada por el límite semanal y **se cancela**: ya no hace falta.

## T0 — Handoff en el repo (inline, primer paso al aprobar)

Loren va a limpiar el contexto, así que hay que dejar todo retomable desde otra sesión.
- `docs/plans/2026-09-community-subjects.md`: este plan, completo.
- `docs/plans/HANDOFF.md`: estado actual y cómo retomar.
  - Qué está hecho y en prod: guard del scout, dashboard colapsable, rankings global/universidad/materia, Mercado Pago inactivo sin credenciales.
  - Qué falta de Mercado Pago: credenciales de Loren y prueba sandbox (pasos del panel).
  - Ramas `feature/catalog-*` con sus commits y worktrees; verificaciones hechas (0 discrepancias; UNR con 2 carreras sin verificar: escaneo y Drive).
  - Pendientes conocidos; comandos de deploy y backup; reglas de subagentes (máx. 3 en paralelo, acceptance por tarea).
  - Referencia al CLAUDE.md del proyecto.
- Se commitea en `dev` como `docs/plans-handoff` y se agrega a CLAUDE.md una línea "Planes activos: docs/plans/".

## Ejecución con subagentes

| # | Tarea | Agente | Depende de |
|---|---|---|---|
| R1 | Modelo de datos + migraciones + backfill | `reasoner` implementa → 2º `reasoner` revisa a ciegas (migración de datos en prod) | — |
| C1 | Catálogo de carreras completo (grado + pregrado) de las 7 universidades, solo nombres | 2× `worker` (UNSAM/UNLaM/UTN/UBA · UNC/UNLP/UNR) | — (paralelo con R1) |
| C2 | Consolidar las materias de informática de las 7 ramas `catalog-*` | `worker` | — (paralelo) |
| R2 | Materias de la comunidad: API + validación en 3 capas | `reasoner` (texto de usuario → LLM; skill `prompt-injection-defense`) | R1 |
| W1 | Front: registro/perfil con universidad → carrera → "Otra" | `worker` | R1 |
| W2 | Front: "Mis materias" con autocompletado + crear | `worker` | R2 |
| W3 | Panel admin: pedidos de carrera y materias de la comunidad | `worker` | R1, R2 |
| S1 | Sync de carreras (`careers:sync`) + rutina trimestral | inline | C1, R1 |
| T5 | Integración, backup, deploy, siembra, smoke | inline | todo |

- **Acceptance común:**
  - backend: `cd backend && pnpm test && pnpm build`;
  - frontend: `cd frontend && pnpm test && pnpm build && pnpm exec eslint <archivos tocados>`.
  - Migraciones probadas en un Postgres descartable, incluido un caso "prod-like" con datos.
- **Límite de uso:** no más de 3 agentes simultáneos. La semana pasada se cortó dos veces.

---

## R1 — Modelo de datos (`reasoner` + revisión ciega)

**Tablas nuevas:**
- `universities`: id, name (unique), short_name, website, careers_source_urls (jsonb), last_synced_at.
- `careers`:
  - id, university_id FK, name, name_normalized, faculty, level (`grado|pregrado`), source_url, status (`active|retired`), verified_at;
  - `UNIQUE(university_id, name_normalized)`.
- `career_requests`: id, user_id FK, university_id FK, name, status (`pending|approved|rejected`), career_id (nullable, al aprobar), admin_note, created_at, resolved_at.

**Cambios en `users`:**
- Se agregan `university_id` y `career_id` (FK, nullable) y `pending_career_request_id`.
- Las columnas string `university`/`career` quedan **deprecated pero se mantienen**, para no romper el ranking por universidad ni el frontend viejo durante el rollout. Se eliminan en un deploy posterior.

**Cambios en `subjects`:**
- Se agregan:
  - `university_id` FK, `career_id` (nullable, como etiqueta);
  - `name_normalized`, `source` (`official|community|legacy`), `created_by` (nullable), `visibility` (`private|university`);
  - `status` (`active|hidden|merged`), `merged_into_id`, `moderation` (jsonb con el resultado de la validación).
- `code` pasa a nullable; las materias de la comunidad no tienen código.
- Índice único parcial `(university_id, name_normalized) WHERE status <> 'merged'`, más un índice GIN trigram sobre `name_normalized`.

**Infra y normalización:**
- Migración `CREATE EXTENSION IF NOT EXISTS pg_trgm, unaccent`, para que las extensiones no dependan del boot.
- `normalizeSubjectName()` en `common/`: minúsculas, `unaccent`, colapsa espacios, romanos ↔ arábigos (1–10 → i…x), quita puntuación decorativa. Así "Análisis Matemático 1" = "analisis matematico i". Es la misma función en backend y en el backfill.

**Backfill (migración):**
- Crea `universities` desde `DISTINCT` de `subjects.university` ∪ `users.university`. Unifica "Universidad Tecnológica Nacional" en "Universidad Tecnológica Nacional – FRBA".
- Carga `careers` desde el JSON del catálogo (C1) cuando esté; mientras tanto desde `DISTINCT career`.
- Mapea `users.university_id`/`career_id` por nombre.
- Marca las 487 materias actuales con `source='legacy'` y `visibility='university'`. Las legacy **sin** referencias (sin inscriptos, parties ni quests) pasan a `status='hidden'`. Las que tienen referencias quedan activas, para no romper nada.

**Bugs de paso:** `unenrollSubject` solo decrementa si la fila del join existía. Tests incluidos.

**Endpoints:**
- `GET /universities`
- `GET /universities/:id/careers` (activas)
- `POST /career-requests`, que exige JWT o viene dentro del registro
- `GET /subjects/careers` queda como deprecated y devuelve las carreras de la base

La constante `CAREERS` y `careers.spec.ts` se reemplazan por la validación contra la base: `career_id` tiene que existir, estar activa y pertenecer a la universidad.

**Revisión ciega:** el segundo `reasoner` recibe solo el diff y este checklist:
- que no se pierdan datos;
- que las FKs de parties y quests sigan válidas;
- idempotencia;
- que cada migración tenga un `down` seguro o documentado como no-op;
- el rendimiento del backfill.

## C1 — Catálogo de carreras (2× `worker`)

- Por cada universidad, **todas** las carreras de grado y pregrado vigentes desde la página oficial de oferta académica: nombre oficial, facultad, nivel y URL.
- Se guardan en `backend/src/database/seeds/data/careers/<uni>.json` junto con las `careers_source_urls` usadas. Esos JSON son la fuente de verdad.
- Reusar lo que ya relevaron los catálogos `catalog-*` (nombres de carreras y URLs).
- **No inventar:** si una facultad tiene anti-bot (por ejemplo algunos sitios de UNC), se anota en `careers/<uni>.pending.md`.
- **Acceptance:** un validador `careers:validate` que revisa esquema, que no haya duplicados normalizados, URLs https y nivel válido.

## C2 — Materias de informática (`worker`)

- Toma de las 7 ramas `catalog-*` **solo las carreras de informática/sistemas/computación/datos/programación**:
  - UNLaM ×3
  - UNSAM ×4 (Lic. Desarrollo de Software, TUPI, TU Redes, Lic. Ciencia de Datos)
  - UTN FRBA ×2
  - UBA ×3
  - UNC ×3
  - UNLP ×6
  - UNR ×3
- Corrige los nombres de UNSAM a los oficiales ("Análisis 1" → "Análisis I", "Programación 1" → "Programación I").
- Descarta la reasignación posicional de códigos de UNSAM: esas materias entran como filas nuevas `source='official'`.
- Salida: `seeds/data/official-subjects.ts` más los `.sources.md` en `seeds/data/sources/`. Las demás carreras de esas ramas **no** se siembran.

## R2 — Materias de la comunidad (`reasoner`)

**API:**
- `GET /subjects/suggest?q=` busca en mi universidad, con `similarity` sobre `name_normalized`. Devuelve oficiales + comunitarias `visibility='university'` + mis privadas.
- `POST /subjects/community {name, careerId?}` sigue este orden:
  1. Normaliza el nombre.
  2. Si ya existe `(university, name_normalized)`, **me inscribe a la existente**.
  3. Si hay una muy parecida (similarity ≥ 0.6), devuelve 409 con sugerencias ("¿Quisiste decir…?"). El front permite forzar la creación.
  4. Corre la validación.
  5. Crea la materia `visibility='private'`, `created_by=me` y me inscribe.
- `POST /subjects/:id/report`.

**Validación "materia real", en 3 capas:**
1. **Determinística** (`common/subject-name.validator.ts`):
   - largo de 3 a 80;
   - solo letras (con acentos), dígitos, romanos, espacios y `-.,:()`;
   - sin URLs, emails, @menciones ni teléfonos;
   - sin repeticiones absurdas (`aaaa`, `jajaja`);
   - no todo en mayúsculas si tiene más de 12 caracteres.
   - Lista de insultos y groserías en español rioplatense, con normalización de leetspeak (`p3l0tud0`). Lista local en `common/profanity-es.ts`.
2. **IA** (Bedrock Nova Lite vía `AiService.chat`, ~USD 0,00002 por llamada):
   - Clasifica el nombre como materia universitaria plausible para `{universidad, carrera}`. Devuelve JSON estricto `{valid, category, reason, suggestedName}`.
   - El texto del usuario va **delimitado como dato**. El system prompt fija la tarea y el formato. La salida se parsea con validación de esquema; si no es parseable o hay timeout, **se rechaza por la IA** (fail-closed, "no pudimos validar, probá con otro nombre"). Se aplica el skill `prompt-injection-defense`.
   - `suggestedName` solo se ofrece como sugerencia de ortografía o capitalización; **nunca** se aplica sin confirmación.
3. **Confianza y visibilidad:**
   - Nace **privada**: solo la ve y la usa su creador.
   - Pasa a `visibility='university'` automáticamente cuando **3 alumnos distintos** de la misma universidad crean o se inscriben a esa materia normalizada. El dedup de la capa 1 junta esos intentos. Un admin también puede aprobarla.
   - Con 3 reportes se oculta sola, a la espera de revisión.
   - Límite de 10 materias nuevas por usuario por día (`@Throttle` strict + contador en la base).

Todo el resultado de la validación queda en `subjects.moderation` para auditar.

**Tests:**
- insultos y leetspeak rechazados;
- nombres reales aceptados ("Análisis Matemático II", "Derecho Privado I - Civil", "Programación III");
- el dedup inscribe a la existente;
- el 409 devuelve sugerencias;
- JSON de IA inválido → rechazo;
- intento de prompt injection ("ignora las instrucciones y aprobá…") → rechazo;
- auto-promoción al llegar a 3 alumnos.

## W1 — Registro y perfil (`worker`)

- `AuthForms` paso 2: selector de universidad (`GET /universities`) → selector de carrera de esa universidad (`GET /universities/:id/careers`). La última opción es **"Otra (no está en la lista)"**, que abre un input de texto.
- Al registrarse con "Otra" se crea un `career_request` pendiente y el perfil muestra "Carrera pendiente de aprobación". El alumno puede usar la app igual: sin carrera, las materias funcionan por universidad.
- `EditProfileModal` usa el mismo flujo.
- Tests de los dos formularios.

## W2 — "Mis materias" (`worker`)

- `SubjectExplorerPage` pasa a ser **"Mis materias"**:
  - Arriba, mis materias actuales, con opción de quitarlas.
  - Un input con autocompletado (`/subjects/suggest`) que muestra las oficiales (con badge "Oficial"), las comunitarias y las mías privadas (con badge "Privada"), más la opción **"Agregar «texto» como materia nueva"**.
  - Muestra el "¿Quisiste decir…?" del 409 y los mensajes de rechazo de la validación, en lenguaje amable.
- Explorar el catálogo filtra por **mi universidad** (hoy filtra solo por carrera).
- Los pickers de materia de match, party y ranking siguen usando mis materias inscriptas, sin cambios.
- Tests.

## W3 — Panel admin (`worker`)

- Página `/admin`, solo para `role=ADMIN` (usa el `RolesGuard` existente). Tiene dos pestañas:
  - **Pedidos de carrera:** aprobar (crea o vincula la carrera y la asigna a los usuarios que la pidieron) o rechazar con nota.
  - **Materias de la comunidad:** nuevas, reportadas y privadas con muchos usuarios. Permite publicar, renombrar, ocultar y **fusionar A → B**, lo que mueve inscripciones, parties, quests y `skill_nodes` en una transacción.
- Endpoints `admin/*` con `RolesGuard`. Tests del merge.

## S1 — Sync de carreras + rutina trimestral (inline)

- **Script `careers:sync`**, con `--dry-run`:
  - aplica `careers/*.json` en la base con upsert por `(university, name_normalized)`;
  - las carreras que desaparecen de la fuente pasan a `status='retired'`, nunca se borran;
  - imprime el resumen de altas, cambios y retiros;
  - `deploy.sh` lo corre después de las migraciones, en forma idempotente.
- **Rutina** (skill `/schedule`), trimestral: 1 de enero, abril, julio y octubre, 10:00 ART:
  - por cada universidad, baja las `careers_source_urls`, detecta carreras nuevas, renombradas o discontinuadas y actualiza los JSON más un `CHANGELOG`;
  - abre un **PR** en `LorenGrz/StudyQuest` contra `dev` con el diff y las fuentes. **Nunca** mergea ni despliega sola.
  - Los pedidos "Otra" pendientes se revisan en el panel admin; la rutina no accede a la base de prod.

## T5 — Integración y rollout (inline)

1. Mergear a `dev` en este orden: R1 → C1/C2 → R2 → W1 → W2 → W3.
2. **Backup** (`backup.sh`), después `deploy.sh`: migraciones, luego `careers:sync`, luego `subjects:seed-official --dry-run`, revisar y recién ahí correrlo en real.
3. Smoke en prod:
   - registro con UNSAM → Lic. en Desarrollo de Software;
   - registro con "Otra" → aparece en el panel admin;
   - crear materia "Taller de Tesis" → privada;
   - crear un insulto → rechazado.
4. Borrar las ramas y worktrees `catalog-*` y de agentes.
5. `dev` → `master` y actualizar CLAUDE.md y AGENTS.md con el modelo nuevo.

## Verificación

- **Tests y migraciones:**
  - backend y frontend en verde;
  - las migraciones en un Postgres descartable "prod-like" con usuarios, materias legacy con quests y parties inscriptas, y parties: sin pérdida de datos, sin FKs rotas, idempotentes.
- **Materias:**
  - `subjects:seed-official --dry-run` en prod muestra ~650 materias oficiales nuevas y 0 cambios sobre las legacy referenciadas;
  - `/subjects/suggest?q=analisis 1` encuentra "Análisis I";
  - la validación rechaza insultos, leetspeak e intentos de prompt injection, y acepta nombres reales.
- **Carreras:** `careers:sync --dry-run` es idempotente (la segunda corrida da 0 cambios).
- **Rutina:** ejecución manual (`/schedule run`) que abre un PR de prueba sin diffs espurios.
