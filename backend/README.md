# StudyQuest — Backend

API REST + WebSocket para la plataforma de estudio colaborativo StudyQuest. Construida con NestJS, TypeORM y PostgreSQL.

---

## Tecnologías

| Librería | Versión | Rol |
|---|---|---|
| NestJS | 10 | Framework principal |
| TypeORM | 0.3 | ORM |
| PostgreSQL | 16 | Base de datos |
| Redis | 7 | Cola de matchmaking en memoria |
| Socket.IO | 4 | WebSockets (matchmaking, chat, quiz) |
| Passport + JWT | — | Autenticación |
| OpenAI SDK | 4 | Generación de quizzes con GPT-4o |
| pdf-parse | — | Extracción de texto de PDFs |
| class-validator | — | Validación de DTOs |
| Swagger | 7 | Documentación de la API |

---

## Requisitos previos

- Node.js 20+
- Docker y Docker Compose (recomendado)
- O bien: PostgreSQL 16 y Redis 7 corriendo localmente

---

## Inicio rápido

### Con Docker (recomendado)

```bash
# Desde la raíz del monorepo
cp .env.example .env
# Editar .env con tus valores (mínimo: OPENAI_API_KEY)

docker compose up -d

# Cargar datos iniciales (universidades y materias)
docker compose exec api npm run seed
```

La API queda disponible en `http://localhost:3000/api/v1`.  
Swagger en `http://localhost:3000/docs`.

### Sin Docker (desarrollo local)

```bash
# Asegurarse de tener PostgreSQL y Redis corriendo
# Opción: levantar solo esos servicios con Docker
docker compose up postgres redis -d

cd backend
npm install
cp ../.env.example .env   # ajustar POSTGRES_HOST=localhost, REDIS_HOST=localhost
npm run start:dev
```

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `POSTGRES_HOST` | Host de PostgreSQL | `localhost` |
| `POSTGRES_PORT` | Puerto | `5432` |
| `POSTGRES_USER` | Usuario | `studyquest` |
| `POSTGRES_PASSWORD` | Contraseña | — |
| `POSTGRES_DB` | Nombre de la base | `studyquest` |
| `TYPEORM_SYNC` | Sincronización automática del schema | `true` (dev), `false` (prod) |
| `TYPEORM_LOGGING` | Loguear queries SQL | `true` / `false` |
| `REDIS_HOST` | Host de Redis | `localhost` |
| `REDIS_PORT` | Puerto | `6379` |
| `REDIS_PASSWORD` | Contraseña | — |
| `JWT_SECRET` | Secreto para firmar tokens | `openssl rand -base64 64` |
| `JWT_EXPIRES_IN` | Expiración del access token | `15m` |
| `OPENAI_API_KEY` | Clave de API de OpenAI | `sk-...` |
| `OPENAI_MODEL` | Modelo a usar | `gpt-4o` |
| `PORT` | Puerto del servidor | `3000` |
| `CORS_ORIGIN` | Origen permitido para CORS | `http://localhost:5173` |

---

## Estructura del proyecto

```
backend/
├── src/
│   ├── main.ts                        # Bootstrap: Helmet, CORS, ValidationPipe, Swagger
│   ├── app.module.ts                  # Módulo raíz con TypeORM, EventEmitter, Schedule
│   │
│   ├── config/
│   │   └── typeorm.config.ts          # DataSource para la app y para la CLI de migraciones
│   │
│   ├── database/
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.ts  # DDL completa: tablas, ENUMs, índices, triggers
│   │   └── seeds/
│   │       └── seed.ts                # Carga materias y universidades de ejemplo
│   │
│   ├── common/
│   │   └── dto/
│   │       └── index.ts               # Todos los DTOs con validación (class-validator)
│   │
│   ├── modules/
│   │   ├── auth/                      # JWT, Passport, login, registro, refresh token
│   │   ├── users/                     # Perfil, XP, inscripción a materias, streaks
│   │   ├── subjects/                  # Catálogo de materias, búsqueda trigram (pg_trgm)
│   │   ├── parties/                   # Salas de estudio, chat, estado online
│   │   ├── quests/                    # Generación de quizzes con IA, gameplay, leaderboard
│   │   └── ai/                        # Integración OpenAI: chunking, prompts, validación
│   │
│   └── gateways/
│       └── matchmaking/
│           ├── matchmaking.gateway.ts  # WebSocket: conexión, eventos, cron cada 5s
│           └── matchmaking.service.ts  # Algoritmo de scoring y matching
│
├── Dockerfile
└── package.json
```

---

## Módulos

### `AuthModule`

Maneja registro, login, refresh y logout. Usa JWT de corta duración (15 min) + refresh tokens de larga duración (30 días) guardados hasheados en la base de datos, permitiendo multi-device con un máximo de 5 tokens simultáneos.

**Endpoints:**

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/register` | Registro con universidad y carrera |
| `POST` | `/auth/login` | Login por email/password |
| `POST` | `/auth/refresh` | Renovar access token |
| `POST` | `/auth/logout` | Invalidar refresh token |

### `UsersModule`

Perfil de usuario, inscripción a materias, XP y streaks. Las estadísticas (`xp`, `level`, `currentStreak`, etc.) se guardan como columna JSONB y se actualizan con queries SQL atómicas para evitar race conditions.

**Endpoints:**

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/users/me` | Obtener perfil propio |
| `PATCH` | `/users/me` | Actualizar displayName, avatarUrl, semester, availability |
| `GET` | `/users/:id` | Perfil público de otro usuario |
| `POST` | `/users/me/subjects` | Inscribirse a una materia |
| `DELETE` | `/users/me/subjects/:id` | Desinscribirse |

### `SubjectsModule`

Catálogo de materias con búsqueda de texto difuso usando `pg_trgm`. Soporta errores tipográficos y búsqueda sin acentos gracias a `unaccent`.

**Endpoints:**

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/subjects` | Listar/buscar materias (paginado) |
| `GET` | `/subjects/universities` | Autocompletado de universidades |
| `GET` | `/subjects/careers` | Carreras de una universidad |
| `GET` | `/subjects/:id` | Detalle de una materia |
| `POST` | `/subjects` | Crear materia (requiere auth) |

**Query params de `/subjects`:**

| Param | Tipo | Descripción |
|---|---|---|
| `search` | string | Búsqueda difusa por nombre o código |
| `university` | string | Filtrar por universidad (ILIKE) |
| `career` | string | Filtrar por carrera |
| `semester` | number | Filtrar por año |
| `page` | number | Paginación (default: 1) |
| `limit` | number | Resultados por página (default: 20, max: 50) |

### `PartiesModule`

Salas de estudio generadas por el sistema de matchmaking. Incluye historial de chat (tabla `chat_messages` normalizada) y estado online por miembro.

**Endpoints:**

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/parties/mine` | Parties activas del usuario autenticado |
| `GET` | `/parties/:id` | Detalle de una party con miembros y quests |
| `GET` | `/parties/:id/chat` | Historial de chat (últimos 100 mensajes) |
| `POST` | `/parties/:id/chat` | Enviar mensaje (también disponible por WebSocket) |

### `QuestsModule`

Generación asíncrona de quizzes desde apuntes (PDF o texto). La generación corre en background para no bloquear el response HTTP; cuando termina, el Gateway notifica a la party por WebSocket.

**Endpoints:**

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/quests` | Crear quest (multipart PDF o JSON con textContent) |
| `GET` | `/quests/party/:partyId` | Quests de una party |
| `GET` | `/quests/:id/play` | Quest para jugar (sin correctIndex ni isCorrect) |
| `POST` | `/quests/:id/start` | Marcar quest como activo |
| `POST` | `/quests/answer` | Enviar respuesta (calcula XP con bonus de velocidad) |
| `POST` | `/quests/:id/complete` | Cerrar quest y distribuir XP final |

---

## WebSocket (Socket.IO)

La conexión requiere un JWT válido en `socket.handshake.auth.token`.

### Eventos que recibe el servidor

| Evento | Payload | Descripción |
|---|---|---|
| `match:join-queue` | `{ subjectIds, availability, preferredPartySize }` | Unirse a la cola de matchmaking |
| `match:leave-queue` | — | Salir de la cola |
| `match:accept` | `{ matchId }` | Confirmar un match encontrado |
| `match:reject` | `{ matchId }` | Rechazar un match |
| `party:join` | `{ partyId }` | Unirse al room de una party existente |
| `party:leave` | — | Salir del room |
| `party:chat` | `{ partyId, text }` | Enviar mensaje de chat |

### Eventos que emite el servidor

| Evento | Payload | Descripción |
|---|---|---|
| `match:queued` | `{ queueSize }` | Confirmación de ingreso a la cola |
| `match:found` | `{ matchId, memberCount, subjectId, members }` | Match compatible encontrado |
| `match:ready` | `{ partyId, party }` | Todos confirmaron — party creada |
| `match:timeout` | `{ message }` | 30s sin confirmación — match cancelado |
| `party:message` | `{ userId, text, sentAt }` | Nuevo mensaje en el chat |
| `party:member-online` | `{ userId, isOnline }` | Cambio de estado de conexión |
| `quest:ready` | `{ questId, title }` | Quest generado y disponible |
| `quest:failed` | `{ questId, error }` | Error en la generación |
| `quest:completed` | `{ questId, results }` | Quest finalizado con leaderboard |
| `error` | `{ code, message }` | Error genérico (ej: `UNAUTHORIZED`) |

### Algoritmo de matchmaking

El cron corre cada 5 segundos y aplica este scoring entre cada par de candidatos:

```
score = (materias_en_común / 3) × 0.5
      + overlap_horario            × 0.3
      + misma_carrera              × 0.2
```

- Threshold inicial: `0.5`. Si el usuario lleva más de 1 minuto esperando baja a `0.35`; más de 2 minutos, a `0.25`.
- Hard filter: si no comparten ninguna materia, score = 0 y no se agrupan.
- Los candidatos tienen 30 segundos para confirmar el match. Si alguno no confirma, todos vuelven a estar disponibles.

---

## Base de datos

### Schema relacional

```
users ──── user_subjects ──── subjects
  │                               │
  └── party_members ──── parties ─┤
            │               │     └── quests
            │               └── chat_messages  │
            └── user                           ├── quiz_questions
                                               │     └── quiz_options
                                               └── player_results
```

### Columnas JSONB

Dos columnas son JSONB de forma intencional para evitar migraciones frecuentes:

**`users.stats`**
```json
{
  "xp": 1500,
  "level": 3,
  "quizzesPlayed": 12,
  "quizzesWon": 8,
  "currentStreak": 4,
  "longestStreak": 7,
  "lastPlayedAt": "2025-03-20T18:00:00Z"
}
```

**`users.availability`**
```json
[
  { "day": 1, "hour": 18 },
  { "day": 3, "hour": 20 },
  { "day": 5, "hour": 10 }
]
```

### Índices destacados

| Tabla | Índice | Tipo | Para qué |
|---|---|---|---|
| `subjects` | `name gin_trgm_ops` | GIN trigram | Búsqueda difusa por nombre |
| `subjects` | `code gin_trgm_ops` | GIN trigram | Búsqueda difusa por código |
| `users` | `availability jsonb_path_ops` | GIN | Overlap horario en matchmaking |
| `users` | `(stats->>'xp') DESC` | Parcial | Leaderboard global |
| `parties` | `(subject_id, status)` | B-tree | Matchmaking por materia |
| `party_members` | `party_id WHERE is_online` | Parcial | Miembros online |
| `player_results` | `(quest_id, score DESC)` | B-tree | Leaderboard por quest |

---

## Migraciones

```bash
# Generar migración desde cambios en entidades
npm run migration:generate -- --name=NombreDeLaMigracion

# Ejecutar migraciones pendientes
npm run migration:run

# Revertir la última migración
npm run migration:revert
```

> En development se puede usar `TYPEORM_SYNC=true` para que TypeORM sincronice el schema automáticamente. En producción siempre usar `TYPEORM_SYNC=false` y gestionar con migraciones.

---

## Fórmulas de juego

**XP por respuesta correcta:**
```
xp = 100 base
   + 50 bonus  (si respondió en menos de 5 segundos)
```

**XP al completar el quest:**
```
xp_total = xp_acumulado + floor(accuracy × 200)
```
donde `accuracy = correctas / total_preguntas`.

**Nivel del usuario:**
```
nivel = floor(sqrt(xp_total / 100))
```

---

## Scripts disponibles

```bash
npm run start:dev       # Servidor con hot reload
npm run start:debug     # Con debugger en puerto 9229
npm run build           # Compilar a dist/
npm run start           # Ejecutar build de producción
npm run lint            # ESLint con autofix
npm run test            # Jest
npm run test:watch      # Jest en modo watch
npm run test:cov        # Jest con coverage
npm run migration:run   # Ejecutar migraciones
npm run migration:revert # Revertir última migración
npm run seed            # Cargar datos iniciales
```