# StudyQuest 🎮📚 — PostgreSQL Edition

Plataforma de estudio colaborativo con matchmaking y quizzes generados por IA.
**Esta versión usa PostgreSQL 16 + TypeORM** en lugar de MongoDB + Mongoose.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Estado | Zustand + React Query |
| Backend | NestJS 10 + TypeScript |
| ORM | TypeORM 0.3 |
| Base de datos | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| WebSockets | Socket.IO 4 |
| IA | OpenAI GPT-4o |
| Contenedores | Docker + Docker Compose |

---

## Por qué PostgreSQL sobre MongoDB para este proyecto

| Aspecto | PostgreSQL | MongoDB |
|---|---|---|
| Relaciones | Nativas con FK + JOIN | Referencias manuales |
| Transacciones | ACID completo siempre | Requiere replica set |
| Leaderboard | `ORDER BY score DESC` simple | Aggregation pipeline |
| Búsqueda texto | `pg_trgm` + `unaccent` | Atlas Search (externo) |
| Datos estructurados | Schema estricto + CHECK | Schema libre |
| JSONB | Para datos semiestructurados (stats, availability) | Nativo |
| Migraciones | TypeORM migrations versionadas | Sin soporte nativo |

**Híbrido inteligente**: las columnas `stats` y `availability` de `users`
son JSONB para evolucionar sin migraciones frecuentes. Todo lo demás
está normalizado con relaciones propias.

---

## Inicio rápido

### 1. Clonar y configurar variables

```bash
git clone https://github.com/tuusuario/studyquest.git
cd studyquest
cp .env.example .env
# Editar .env — obligatorio: OPENAI_API_KEY y las contraseñas
```

### 2. Levantar con Docker Compose

```bash
# Servicios principales
docker compose up -d

# Con herramientas de administración (pgAdmin + Redis Commander)
docker compose --profile tools up -d
```

### 3. Poblar datos iniciales

```bash
# Carga universidades y materias de ejemplo
docker compose exec api npm run seed
```

### 4. Acceder a los servicios

| Servicio | URL |
|---|---|
| Frontend (React) | http://localhost:5173 |
| API (NestJS) | http://localhost:3000/api/v1 |
| Swagger UI | http://localhost:3000/docs |
| pgAdmin | http://localhost:8080 (profile: tools) |
| Redis Commander | http://localhost:8082 (profile: tools) |

---

## Estructura del proyecto

```
studyquest/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── typeorm.config.ts      # DataSource + opciones PG
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   │   └── 001_initial_schema.ts  # Tablas, índices, triggers
│   │   │   └── seeds/
│   │   │       └── seed.ts            # Datos iniciales (materias)
│   │   ├── modules/
│   │   │   ├── auth/                  # JWT, estrategia Passport
│   │   │   ├── users/
│   │   │   │   ├── user.entity.ts     # Entidad TypeORM con JSONB
│   │   │   │   ├── users.service.ts   # Lógica con QueryBuilder
│   │   │   │   └── users.controller.ts
│   │   │   ├── subjects/
│   │   │   │   ├── subject.entity.ts
│   │   │   │   └── subjects.service.ts  # Búsqueda con pg_trgm
│   │   │   ├── parties/
│   │   │   │   ├── party.entity.ts
│   │   │   │   ├── party-member.entity.ts
│   │   │   │   ├── chat-message.entity.ts
│   │   │   │   └── parties.service.ts
│   │   │   ├── quests/
│   │   │   │   ├── quest.entity.ts
│   │   │   │   ├── quiz-question.entity.ts
│   │   │   │   ├── quiz-option.entity.ts
│   │   │   │   ├── player-result.entity.ts
│   │   │   │   └── quests.service.ts
│   │   │   └── ai/
│   │   │       └── ai.service.ts      # OpenAI + chunking
│   │   └── gateways/
│   │       └── matchmaking/           # WebSocket + cron scheduler
└── frontend/                          # React (sin cambios vs versión Mongo)
```

---

## Schema relacional

```
users ──────────────── user_subjects ─────── subjects
  │                                              │
  │ (partyMemberships)                           │ (parties)
  ▼                                              ▼
party_members ──────── parties ──────────── quests
  │                      │                    │
  │                      ▼                    ├── quiz_questions
  │                 chat_messages             │     └── quiz_options
  │                                           └── player_results
  └──────────────────────────────────────── (user FK)
```

---

## Índices PostgreSQL destacados

| Tabla | Índice | Tipo | Propósito |
|---|---|---|---|
| `users` | `(university, career)` | B-tree | Matchmaking por perfil académico |
| `users` | `availability jsonb_path_ops` | GIN | Overlap horario |
| `users` | `(stats->>'xp') DESC` WHERE active | Parcial | Leaderboard global |
| `subjects` | `name gin_trgm_ops` | GIN trigram | Búsqueda difusa |
| `subjects` | `code gin_trgm_ops` | GIN trigram | Búsqueda por código |
| `subjects` | `(university, career, semester)` | B-tree | Explorador filtrado |
| `subjects` | `enrolled_count DESC` WHERE active | Parcial | Popularidad |
| `parties` | `(subject_id, status)` | B-tree | Matchmaking rápido |
| `party_members` | `user_id` | B-tree | Parties de un usuario |
| `party_members` | `party_id` WHERE online | Parcial | Solo online |
| `chat_messages` | `(party_id, created_at DESC)` | B-tree | Historial paginado |
| `quests` | `(party_id, status, created_at DESC)` | B-tree | Listado por party |
| `player_results` | `(quest_id, score DESC)` | B-tree | Leaderboard |

---

## Migraciones

```bash
# En development: TYPEORM_SYNC=true (sincronización automática)
# En production: TYPEORM_SYNC=false + migraciones

# Generar migración desde cambios en entidades
docker compose exec api npm run migration:generate -- --name=AddFeatureX

# Ejecutar migraciones pendientes
docker compose exec api npm run migration:run

# Revertir última migración
docker compose exec api npm run migration:revert
```

---

## Comandos útiles

```bash
# Logs del API
docker compose logs api -f

# Shell de PostgreSQL
docker compose exec postgres psql -U studyquest -d studyquest

# Queries útiles de diagnóstico
# -- Usuarios en cola de matchmaking (en Redis)
# -- Parties activas con miembros online:
# SELECT p.id, s.name, COUNT(*) FILTER (WHERE pm.is_online) as online
# FROM parties p
# JOIN subjects s ON p.subject_id = s.id
# JOIN party_members pm ON pm.party_id = p.id
# WHERE p.status = 'active'
# GROUP BY p.id, s.name;

# Rebuildar solo el backend
docker compose up api --build -d

# Detener todo (preserva datos)
docker compose down

# Detener y borrar volúmenes (⚠️ borra base de datos)
docker compose down -v
```

---

## Variables de entorno

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=studyquest
POSTGRES_PASSWORD=tu_password_seguro
POSTGRES_DB=studyquest
TYPEORM_SYNC=true          # false en producción
TYPEORM_LOGGING=false      # true para debug de queries

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tu_redis_password

# JWT
JWT_SECRET=genera_con_openssl_rand_base64_64

# OpenAI
OPENAI_API_KEY=sk-...

# App
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
```