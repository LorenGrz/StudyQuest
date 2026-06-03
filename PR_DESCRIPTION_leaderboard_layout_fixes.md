# Pull Request Description

**Target Branch:** `dev`  
**Source Branch:** `lorenIssues`  
**PR Title:** `feat: global leaderboard, layout spacing fixes, Tailwind v4 migration & Docker hotfix`

---

## 📝 Resumen de Cambios

Este PR resuelve múltiples incidentes y añade características de clasificación global/por materia en el Home, migración a Tailwind CSS v4, uniformidad en el espaciado de layouts móviles, y corrección de la persistencia/bloqueo de módulos de dependencias en Docker Compose.

### 1. 🏆 Leaderboards (Inicio / Dashboard)
- **Backend:**
  - Se implementó el método `getGlobalLeaderboard(limit)` en `users.service.ts` para consultar y ordenar los usuarios por su nivel de ELO de forma descendente.
  - Se expuso la ruta `GET /api/v1/users/leaderboard/global` en `users.controller.ts`.
- **Frontend:**
  - Se añadió la consulta en `userService.ts` (`getGlobalLeaderboard`).
  - Se implementó el componente dinámico `HomeLeaderboardPreview` en la página de inicio (`dashboard.tsx`), con pestañas para alternar de forma interactiva entre el Ranking **Global** de ELO (Top 5) y los rankings individuales por cada materia en la que el usuario esté inscrito (ej. **AED**, **BD**).

### 2. 📱 Corrección de Espaciado y Layouts ("Suelo del Home")
- Se rediseñó el flujo en `Layouts.tsx` para evitar superposiciones con la barra de navegación:
  - `.mobile-layout` ahora es un contenedor Flex vertical (`h-dvh flex flex-col overflow-hidden`).
  - El contenido principal (`.mobile-main` o el hijo intermedio) toma el espacio restante (`flex-1`) con scroll independiente.
  - El componente `BottomNav` ya no usa posicionamiento fijo (`fixed`) y se ubica de forma natural al final del flujo (`shrink-0`), asegurando que ningún contenido se oculte detrás.
  - **Alineación en Desktop:** Se agregó la clase `self-center` (`align-self: center;`) a todas las plantillas de layouts (`MobileLayout`, `FullscreenLayout`, `GameLayout`) y a la vista de Match, garantizando que el simulador móvil se renderice **perfectamente centrado** en pantallas de escritorio.

### 3. ⚔️ Refactorización de la Vista de Match a Tailwind CSS v4
- Se eliminó el padding-bottom manual (`padding-bottom: 92px`) obsoleto de la antigua clase `.mc-page` que causaba que la barra de navegación de Match apareciera flotando ("levantada") con un espacio negro debajo.
- Se migró toda la interfaz y componentes de Match (`MatchPage.tsx` y `MatchComponents.tsx`) a clases utilitarias directas de **Tailwind CSS v4**.
- Se eliminaron aproximadamente **540 líneas de estilos estáticos `.mc-*`** de `index.css`, limpiando el archivo y reduciendo el peso de la hoja de estilos global en ~8 KB.

### 4. 🐳 Docker Compose & Auto-Seeding Hotfix
- **Auto-Seeding:** Se configuró el punto de entrada de la API en `main.ts` para que, en entorno de desarrollo, si el esquema está sincronizado pero no hay usuarios registrados, ejecute automáticamente el script de población (`pnpm run seed`) una única vez.
- **Docker Volume Caching Fix:** Se corrigieron los bloqueos `[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY]` agregando `confirm-modules-purge=false` y `verify-deps-before-run=false` en los archivos `.npmrc`.
- **Startup Sync:** Se modificaron los comandos de ejecución de los servicios `web` y `api` en `docker-compose.yml` para ejecutar `pnpm install` al iniciar el contenedor. Esto soluciona los errores de importación fallidos (ej. `@tailwindcss/vite` no encontrado) causados por volúmenes anónimos desactualizados.

---

## 🧪 Verificación Realizada

- Se verificó que tanto la API de NestJS como el servidor de desarrollo de Vite arrancan de manera exitosa y se comunican sin bloqueos en el flujo de Docker.
- Se compiló con éxito el frontend (`pnpm run build`), garantizando la ausencia de errores de sintaxis o tipado en TypeScript.
- Se comprobó la correcta resolución y centrado de los contenedores en desktop.
