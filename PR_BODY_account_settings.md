# Sprint 4 — Configuración de Cuenta y Personalización

Closes #109, Closes #140, Closes #141, Closes #142, Closes #143, Closes #144, Closes #145

## Backend
- `PATCH /users/me/password`: cambio de contraseña validando la actual con bcrypt; invalida los refresh tokens al cambiarla (#140).
- `POST /users/me/avatar`: upload de avatar (jpeg/png/webp, máx 2MB) almacenado en `/uploads/avatars/` con nombre UUID, servido como estático (#141).
- Campo `bio` (varchar 500) en `User`; `username` y `bio` editables vía `PATCH /users/me` con pre-chequeo de unicidad de username (409).
- Tests unitarios de `UsersService` (changePassword, conflicto de username, setAvatar).

## Frontend
- Nueva ruta protegida `/settings` con tabs **Perfil, Seguridad, Apariencia, Notificaciones** (placeholder) (#142).
- **Perfil**: editar username y bio (contador 500), subir avatar con preview local antes de guardar (#143).
- **Seguridad**: formulario de cambio de contraseña con validación cliente (longitud, coincidencia, distinta a la actual) y manejo de 401 (#144).
- **Apariencia**: toggle tema claro/oscuro vía `data-theme` + variables CSS, persistido en `localStorage` (#145).
- Tokens de Tailwind mapeados a las variables CSS existentes; paleta light agregada en `index.css`.
- Acceso desde ProfilePage (botón ⚙️ Configuración).
- Tests de componente: tabs, validación de contraseña, persistencia del tema.

## Tests
- Backend: `npx jest` — 24 passed (el fallo de `tournaments.service.spec.ts` es preexistente en `dev`, error de parseo no relacionado).
- Frontend: `npx vitest run` — 26 passed; `pnpm build` OK.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
