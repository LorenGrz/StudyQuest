# StudyQuest Backend 🚀

Servidor API RESTful y WebSockets en tiempo real construido con **NestJS 11** y **TypeScript**. Se encarga de la lógica de dominio, matchmaking, procesamiento de archivos, autenticación, y generación de cuestionarios interactivos por Inteligencia Artificial.

---

## Tecnologías y Herramientas
* **Framework**: NestJS 11
* **Lenguaje**: TypeScript
* **Bases de datos**:
  * **PostgreSQL 16**: Almacenamiento transaccional persistente (usuarios, materias, quests, chat persistente, resultados).
  * **Redis 7.2**: Gestión de colas de matchmaking en tiempo real y persistencia de estados de presencia efímeros.
* **ORM**: TypeORM 0.3 (con sincronización automática en desarrollo)
* **Sockets**: Socket.IO (integrado mediante `@nestjs/platform-socket.io`)
* **Integración IA**:
  * **Google Generative AI SDK**: Conexión nativa con Google Gemini (modelo optimizado: `gemini-2.5-flash`).
  * **MarkItDown API Client**: Cliente de integración para convertir archivos PDF en Markdown limpio antes de enviarlos al LLM.
* **Autenticación**: Passport JWT (Tokens de acceso y Refresh Tokens)
* **Gestión de Archivos**: Multer con almacenamiento local (`/uploads`)
* **Testing**: Jest (unitario y e2e)

---

## Estructura de Módulos (`src/modules/`)

El servidor está estructurado en módulos NestJS autocontenidos:

### 1. `auth` (Autenticación)
* Maneja el registro en 2 pasos, login de usuarios, generación de JWT y refresco seguro de tokens (`RefreshToken`).
* Guards y estrategias personalizadas (`JwtAuthGuard`, `JwtStrategy`).

### 2. `users` (Gestión de Usuarios y Gamificación)
* Perfiles de usuario, administración de relaciones de amigos (`friends`), adición de XP, cálculo de streak de días consecutivos y actualización de rango de ELO competitivo (sistema dinámico de ranking).

### 3. `subjects` (Catálogo de Materias)
* Registro de universidades, carreras y asignaturas académicas.
* Implementa búsquedas rápidas con algoritmos de coincidencia de texto (trigram search).

### 4. `parties` (Salas de Estudio)
* Gestión de salas de estudio colaborativas.
* **Chat Grupal Enriquecido**: Envío de mensajes de texto en tiempo real, notas de voz de audio (con reproductor integrado) y archivos adjuntos (PDFs u otros). Los archivos y audios se suben vía REST (`POST /api/v1/parties/:id/chat/file` / `POST /api/v1/parties/:id/chat/audio`), se almacenan bajo `/uploads` y se anuncian al canal WebSocket de la sala.

### 5. `quests` (Cuestionarios generados por IA)
* Generación en segundo plano de cuestionarios interactivos a partir de texto o PDFs.
* Utiliza el microservicio **MarkItDown** para extraer el texto estructurado del PDF. Si el servicio no está disponible o el archivo tiene poco texto plano, aplica un fallback usando el parser de PDFs nativo (`pdf-parse`) para alimentar al prompt del LLM.

### 6. `skill-tree` (Árbol de Habilidades)
* Sistema de progreso donde los estudiantes desbloquean nodos del árbol de conocimientos de cada materia según el XP obtenido en temas específicos al responder quests.

### 7. `matchmaking` (Gateway WebSockets)
* El gateway principal (`matchmaking.gateway.ts`) gestiona la conexión Socket.IO, une a los usuarios a salas de espera según sus materias deseadas, avisa emparejamientos confirmados (`match:found`), procesa aceptaciones/rechazos y conecta a los participantes directamente a su nueva **Party**.

---

## Scripts Disponibles

* **Instalar Dependencias**:
  ```bash
  pnpm install
  ```
* **Iniciar Servidor en Desarrollo (con hot-reload)**:
  ```bash
  pnpm run start:dev
  ```
* **Iniciar Servidor en Producción**:
  ```bash
  pnpm run start:prod
  ```
* **Ejecutar Pruebas Unitarias**:
  ```bash
  pnpm run test
  ```
* **Ejecutar Pruebas e2e (End-to-End)**:
  ```bash
  pnpm run test:e2e
  ```
* **Poblar Base de Datos (Semilla base)**:
  ```bash
  pnpm run seed
  ```
* **Poblar Árbol de Habilidades**:
  ```bash
  pnpm run seed:skill-tree
  ```

---

## Configuración y Variables de Entorno

El backend utiliza un archivo `.env` en la raíz del proyecto. Las variables más importantes de este componente son:

```ini
# Configuración del Servidor
PORT=3000
NODE_ENV=development

# Base de datos PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=studyquest
POSTGRES_PASSWORD=studyquest_pass
POSTGRES_DB=studyquest
TYPEORM_SYNC=true

# Redis (Caché y matchmaking)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redispass

# Secretos JWT
JWT_SECRET=tu-secreto-super-seguro
JWT_EXPIRES_IN=7d

# Proveedor de IA y API Keys
AI_PROVIDER=gemini  # Opciones: gemini, openai, anthropic, groq, mock
GEMINI_API_KEY=tu-api-key-de-google-studio
GEMINI_MODEL=gemini-2.5-flash

# Sidecar de conversión de PDFs
MARKITDOWN_URL=http://localhost:3001
MARKITDOWN_TIMEOUT_MS=30000
```
