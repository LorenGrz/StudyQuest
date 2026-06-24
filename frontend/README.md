# StudyQuest Frontend 🎨

Aplicación cliente web SPA (Single Page Application) responsiva y mobile-first para la plataforma de estudio colaborativo **StudyQuest**. Construida con **React 19**, **TypeScript**, **Tailwind CSS 4** y **Vite 8**.

---

## Tecnologías y Herramientas

| Librería | Versión | Rol |
|---|---|---|
| **React** | 19 | UI declarativa y componentes |
| **TypeScript** | 5.9 | Tipado estático y robustez del código |
| **Vite** | 8 | Bundler ultrarrápido y servidor de desarrollo |
| **Tailwind CSS** | 4 | Framework de estilos CSS nativo |
| **React Router** | 7 | Enrutamiento e historial de la SPA |
| **Zustand** | 5 | Gestión del estado global y persistente |
| **Recharts** | 2.15 | Visualización de estadísticas y gráficos del usuario |
| **Socket.IO Client** | 4.8 | Conexión WebSocket para matchmaking en tiempo real y chat |
| **Framer Motion** | 12 | Micro-animaciones fluidas (radar de matchmaking, transiciones) |
| **React Hot Toast** | 2.6 | Notificaciones integradas en tiempo de ejecución |
| **Vitest** | 3.2 | Framework de ejecución de pruebas unitarias |

---

## Requisitos Previos

* **Node.js**: Versión 20 o superior
* **Backend**: El backend corriendo localmente (ver README de la raíz o de `backend/`)

---

## Inicio Rápido

1. Entra al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias del proyecto:
   ```bash
   pnpm install
   ```
3. Levanta el servidor de desarrollo:
   ```bash
   pnpm run dev
   ```
   La aplicación se iniciará en [http://localhost:5173](http://localhost:5173).

---

## Estructura del Directorio (`src/`)

El cliente está estructurado de la siguiente manera:

```
frontend/
├── src/
│   ├── App.tsx                  # Enrutador principal de la app y proveedores globales
│   ├── index.css                # Configuración de Tailwind CSS 4 y estilos globales
│   │
│   ├── components/              # Componentes de UI compartidos
│   │   ├── layout/              # Navbars, Sidebars y Layouts principales
│   │   ├── party-chat/          # Componentes de burbujas de texto, audio y adjuntos del chat
│   │   └── PartyComponents.tsx  # Componentes internos de la sala de estudio (Party)
│   │
│   ├── pages/                   # Vistas principales de la aplicación (SPA Pages)
│   │   ├── dashboard.tsx        # Panel central: XP, partidos recomendados, quests del día
│   │   ├── AuthPage.tsx         # Inicio de sesión y registro en pasos
│   │   ├── SubjectExplorerPage.tsx # Explorador y buscador de materias
│   │   ├── MatchPage.tsx        # Pantalla interactiva de radar y confirmación de matchmaking
│   │   ├── PartiesPage.tsx      # Descubridor de parties activas
│   │   ├── PartyRoomPage.tsx    # Sala de la party (tabs: Quests, Chat, Miembros)
│   │   ├── QuizPage.tsx         # Trivia de juego interactiva con temporizador de 30s
│   │   ├── ProfilePage.tsx      # Estadísticas de ELO, medallas e insignias desbloqueadas
│   │   ├── SettingsPage.tsx     # Ajustes del perfil del usuario
│   │   ├── SkillTreePage.tsx    # Árbol de habilidades y progreso temático por materia
│   │   ├── FriendsPage.tsx      # Administración de lista de amigos y solicitudes
│   │   └── TournamentsPage.tsx  # Visualización de torneos activos y clasificaciones
│   │
│   ├── hooks/                   # Hooks personalizados para encapsular lógica reactiva
│   │   ├── useAuth.ts           # Lógica de login, registro e información de perfil
│   │   ├── useMatch.ts          # Integración de WS para matchmaking y confirmación
│   │   ├── useParty.ts          # Suscripción a eventos de socket de la party activa y mensajes
│   │   ├── useQuiz.ts           # Control del juego, cuenta regresiva y envío de respuestas
│   │   ├── useSkillTree.ts      # Consultas y carga del árbol de habilidades
│   │   └── useSocket.ts         # Hook de acceso al singleton de Socket.IO
│   │
│   ├── store/                   # Stores de Zustand para estado global ligero
│   │   ├── authStore.ts         # Usuario activo, autenticación y tokens (con persistencia local)
│   │   └── partyStore.ts        # Datos de la party en pantalla
│   │
│   ├── services/                # Clientes y conectores HTTP (Axios) y WebSockets
│   │   ├── api.ts               # Cliente Axios configurado con interceptor de renovación de token (refresh token)
│   │   ├── socketService.ts     # Manejador del ciclo de vida y eventos del WebSocket
│   │   └── ...Service.ts        # Servicios dedicados a cada entidad (parties, quests, friends, etc.)
│   │
│   └── test/                    # Configuración de pruebas
```

---

## Gestión de Estado Global (Zustand)

### 1. `authStore.ts`
Mantiene la información del usuario logueado (`user`), el token de acceso (`accessToken`), el token de refresco (`refreshToken`) y el estado de autenticación. Utiliza el middleware de persistencia de Zustand para almacenar de forma segura las credenciales en el `localStorage` del navegador.

### 2. `partyStore.ts`
Administra el estado local de la sala de estudio a la que está unida actualmente el usuario.

---

## Comunicación y Eventos (WebSockets)

La app utiliza `socketService.ts` para establecer una conexión de WebSocket estable e interactiva con el backend.
* El token de acceso se envía en la fase de negociación (`handshake.auth.token`).
* El servicio realiza reconexiones automáticas si se pierde el enlace de red.
* Se utiliza principalmente en:
  * **Matchmaking**: Unirse a la cola (`match:join-queue`), aceptar emparejamiento (`match:accept`), e informar cuando el grupo está listo.
  * **Party Chat**: Difusión e ingesta inmediata de nuevos mensajes de chat en tiempo real.
  * **Presence**: Actualización de la lista de miembros de la sala indicando quiénes están online (punto verde interactivo).
  * **Status de Quests**: Notificación en tiempo real cuando un Quest pasa de estar en generación (`generating`) a estar listo para jugar (`ready`).

---

## Scripts Disponibles

* **`pnpm run dev`**: Levanta el servidor de desarrollo local mediante Vite.
* **`pnpm run build`**: Compila y optimiza el código de producción con TypeScript.
* **`pnpm run preview`**: Abre localmente el build de producción compilado.
* **`pnpm run test`**: Ejecuta las pruebas unitarias y de integración utilizando Vitest.
* **`pnpm run lint`**: Ejecuta el análisis de linter ESLint.
```