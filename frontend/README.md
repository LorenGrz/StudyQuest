# StudyQuest — Frontend

Aplicación web mobile-first para la plataforma de estudio colaborativo StudyQuest. Construida con React 18, TypeScript, Tailwind CSS y Vite.

---

## Tecnologías

| Librería | Versión | Rol |
|---|---|---|
| React | 18 | UI |
| TypeScript | 5 | Tipado estático |
| Vite | 5 | Build tool y dev server |
| Tailwind CSS | 3 | Estilos utilitarios |
| React Router | 6 | Navegación |
| Zustand | 4 | Estado global |
| TanStack Query | 5 | Cache de servidor + fetching |
| Axios | 1.6 | Cliente HTTP con interceptores |
| Socket.IO Client | 4 | WebSocket (matchmaking, chat, quiz) |
| Framer Motion | 11 | Animaciones (matchmaking, quiz) |
| React Hook Form | 7 | Formularios |
| Zod | 3 | Validación de schemas |
| React Hot Toast | 2 | Notificaciones |

---

## Requisitos previos

- Node.js 20+
- El backend corriendo en `http://localhost:3000` (ver README del backend)

---

## Inicio rápido

```bash
cd frontend
npm install
npm run dev
```

La app queda disponible en `http://localhost:5173`.

### Variables de entorno

Crear un archivo `.env.local` en `/frontend`:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

---

## Estructura del proyecto

```
frontend/
├── src/
│   ├── App.tsx                  # Router principal + React Query provider + Toaster
│   ├── index.css                # Tailwind + clases utilitarias globales (input-base, btn-primary)
│   │
│   ├── pages/
│   │   └── index.tsx            # Las 6 páginas de la app (en un único archivo)
│   │       ├── AuthPage         # Login y registro en 2 pasos
│   │       ├── DashboardPage    # Panel principal con XP, streak y parties activas
│   │       ├── SubjectsPage     # Explorador de materias con búsqueda y filtros
│   │       ├── MatchmakingPage  # Búsqueda de party con animación de radar
│   │       ├── PartyRoomPage    # Sala de party (tabs: Quests / Chat / Miembros)
│   │       └── QuizPage         # Interfaz de juego tipo Preguntados con timer
│   │
│   ├── hooks/
│   │   └── index.ts
│   │       ├── useMatchmaking   # Lógica de búsqueda de party por WebSocket
│   │       ├── useParty         # Suscripción a eventos de la sala (chat, online, quests)
│   │       └── useQuiz          # Timer, envío de respuestas y manejo de resultados
│   │
│   ├── store/
│   │   └── index.ts             # Stores de Zustand
│   │       ├── useAuthStore     # Usuario autenticado y tokens (persistido en localStorage)
│   │       ├── useMatchmakingStore  # Estado de la búsqueda (idle/searching/found/ready)
│   │       ├── usePartyStore    # Party activa, mensajes de chat, estado de quests
│   │       └── useQuizStore     # Estado del quiz en juego (pregunta actual, timer, resultados)
│   │
│   └── services/
│       ├── api.ts               # Instancia de Axios con interceptor de refresh token automático
│       └── socket.ts            # Singleton de Socket.IO con reconexión automática
│
├── tailwind.config.ts           # Paleta de colores y fuentes personalizadas
├── Dockerfile
└── package.json
```

---

## Páginas

### `AuthPage` — `/login` y `/register`

Formulario de login y registro en dos pasos. El registro guía al usuario primero a crear su cuenta (email, contraseña, username) y luego a seleccionar su universidad y carrera desde listas dinámicas cargadas de la API.

- Rutas públicas: redirigen a `/dashboard` si el usuario ya está autenticado.
- Validación con Zod + React Hook Form.
- Tras el registro o login exitoso, guarda los tokens en Zustand (persistido) y redirige al dashboard.

### `DashboardPage` — `/dashboard`

Panel principal con vista general del progreso del usuario:

- Barra de XP con progreso al siguiente nivel.
- Streak de días consecutivos jugando.
- Cards de parties activas con acceso rápido.
- Botones de acceso rápido a Matchmaking y Explorador de Materias.

### `SubjectsPage` — `/subjects`

Explorador de materias del catálogo:

- Búsqueda con debounce (400ms) que usa la búsqueda trigram del backend.
- Lista de resultados con contador de inscriptos.
- Botón "Unirme" que muta el estado del usuario y actualiza el store.
- Indicador "✓ Inscripto" para materias ya cursando.

### `MatchmakingPage` — `/matchmaking`

Flujo de búsqueda de party en 4 estados:

| Estado | Vista |
|---|---|
| `idle` | Selector de materias para las que buscar compañeros |
| `searching` | Animación de radar con tres anillos pulsantes (Framer Motion) |
| `found` | Preview del grupo encontrado con botones Aceptar / Rechazar |
| `confirming` | Spinner esperando que todos los miembros confirmen |

Toda la comunicación es por WebSocket (ver hook `useMatchmaking`).

### `PartyRoomPage` — `/party/:partyId`

Sala de estudio con tres tabs:

**Tab Quests:**
- Formulario para subir apunte (texto pegado o PDF hasta 10 MB).
- El backend procesa en background y notifica por WebSocket cuando el quiz está listo.
- Lista de quests con su estado (`generating` / `ready` / `active` / `completed` / `failed`).
- Botón "¡Jugar!" visible solo cuando el estado es `ready`.

**Tab Chat:**
- Historial de mensajes cargado desde la API al montar.
- Mensajes en tiempo real por WebSocket.
- Burbujas diferenciadas: propios a la derecha, ajenos a la izquierda.
- Envío con Enter o botón.

**Tab Miembros:**
- Avatar con indicador de presencia (punto verde = online).
- XP acumulado dentro de la party.

### `QuizPage` — `/quiz/:questId`

Interfaz de juego tipo Preguntados:

- Timer visual de 30 segundos por pregunta (barra que se achica + color rojo al llegar a 5s).
- Badge de dificultad (`fácil` / `medio` / `difícil`) y subtema de la pregunta.
- 4 opciones con animación de feedback al responder (verde = correcto, rojo = incorrecto).
- Explicación del LLM visible después de responder.
- Avance automático a la siguiente pregunta a los 2.5 segundos.
- Pantalla de resultados final con leaderboard ordenado por puntaje.

---

## Estado global (Zustand)

### `useAuthStore`

```ts
{
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  setAuth(user, accessToken, refreshToken): void
  setUser(user): void
  updateTokens(accessToken, refreshToken): void
  logout(): void
}
```

Persiste `accessToken`, `refreshToken` e `isAuthenticated` en `localStorage` (clave `studyquest-auth`). Al iniciar la app, si `isAuthenticated` es `true`, re-fetcha el perfil del usuario para hidratar el store.

### `useMatchmakingStore`

```ts
{
  state: 'idle' | 'searching' | 'found' | 'confirming' | 'ready' | 'error'
  matchFound: { matchId, memberCount, subjectId, members } | null
  selectedSubjectIds: string[]
}
```

### `usePartyStore`

```ts
{
  party: Party | null
  messages: ChatMessage[]

  setParty(party): void
  addMessage(msg): void
  updateMemberOnline(userId, isOnline): void
  addQuest(quest): void
  updateQuestStatus(questId, status): void
}
```

### `useQuizStore`

```ts
{
  questId: string | null
  questions: QuizQuestion[]
  currentIndex: number
  selectedOption: number | null
  answerResult: { isCorrect, correctIndex, explanation, xpEarned } | null
  timeLeft: number
  leaderboard: LeaderboardEntry[]
  isCompleted: boolean
  totalXpEarned: number
}
```

---

## Servicios

### `api.ts` — Cliente HTTP

Instancia de Axios preconfigurada con:

- `baseURL`: `VITE_API_URL/api/v1`
- **Request interceptor**: inyecta el `Authorization: Bearer <accessToken>` en cada request.
- **Response interceptor**: ante un `401`, intenta renovar el token con el refresh token de forma transparente. Los requests que fallaron durante el refresh se reintentan automáticamente con el nuevo token. Si el refresh también falla, hace logout y redirige a `/login`.

```ts
import { authApi, usersApi, subjectsApi, partiesApi, questsApi } from './services/api';
```

### `socket.ts` — WebSocket singleton

Crea una única instancia de Socket.IO que:

- Se conecta con el `accessToken` actual en `handshake.auth.token`.
- Reconecta automáticamente hasta 10 veces con delay creciente.
- Expone `getSocket()`, `disconnectSocket()` y `updateSocketToken(token)`.

```ts
import { getSocket } from './services/socket';

const socket = getSocket();
socket.emit('match:join-queue', payload);
socket.on('match:found', handler);
```

---

## Hooks

### `useMatchmaking()`

Encapsula toda la lógica del flujo de matchmaking: suscripción a eventos WebSocket, cambios de estado, y emisión de eventos al servidor.

```ts
const {
  state,               // 'idle' | 'searching' | 'found' | 'confirming' | 'ready'
  matchFound,          // datos del match encontrado
  selectedSubjectIds,
  setSelectedSubjects,
  joinQueue,           // emite match:join-queue
  leaveQueue,          // emite match:leave-queue
  acceptMatch,         // emite match:accept
  rejectMatch,         // emite match:reject
  reset,
} = useMatchmaking();
```

### `useParty(partyId)`

Se conecta al room de la party al montar y se desconecta al desmontar. Mantiene los mensajes de chat sincronizados con el store.

```ts
const { party, messages, sendMessage } = useParty(partyId);
```

### `useQuiz(questId)`

Carga las preguntas al montar, maneja el countdown por pregunta con `setInterval`, envía respuestas a la API y avanza automáticamente.

```ts
const {
  currentQuestion,
  currentIndex,
  totalQuestions,
  selectedOption,
  answerResult,
  timeLeft,
  isCompleted,
  totalXpEarned,
  leaderboard,
  handleAnswer,        // fn(optionIndex: number)
} = useQuiz(questId);
```

---

## Clases de utilidad (CSS global)

Definidas en `src/index.css`, disponibles en toda la app:

```css
.input-base      /* Input oscuro con focus ring violeta */
.btn-primary     /* Botón violeta con active scale */
.btn-secondary   /* Botón con borde sutil */
.page-loader     /* Pantalla de carga con spinner centrado */
```

---

## Paleta de colores (Tailwind)

```ts
// tailwind.config.ts
colors: {
  brand: {
    bg:      '#0D1117',   // fondo de página
    surface: '#161B22',   // fondo de cards
    border:  '#21262D',   // bordes
    violet:  { DEFAULT: '#7C3AED', light: '#A78BFA' },
    emerald: '#10B981',   // XP, éxito, inscripto
    amber:   '#F59E0B',   // streaks, oro, achievements
    coral:   '#F43F5E',   // errores, peligro
  }
}
```

Fuente: **Space Grotesk** (cargada desde Google Fonts en `index.css`).

---

## Scripts disponibles

```bash
npm run dev        # Dev server en http://localhost:5173
npm run build      # Build de producción en dist/
npm run preview    # Previsualizar el build
npm run lint       # ESLint con autofix
```

---

## Rutas de la aplicación

| Ruta | Componente | Acceso |
|---|---|---|
| `/login` | `AuthPage` (mode=login) | Solo no autenticados |
| `/register` | `AuthPage` (mode=register) | Solo no autenticados |
| `/dashboard` | `DashboardPage` | Requiere auth |
| `/subjects` | `SubjectsPage` | Requiere auth |
| `/matchmaking` | `MatchmakingPage` | Requiere auth |
| `/party/:partyId` | `PartyRoomPage` | Requiere auth |
| `/quiz/:questId` | `QuizPage` | Requiere auth |
| `*` | Redirect a `/dashboard` | — |