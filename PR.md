## Summary
- Se implementó la vista de **Party Chat** dentro de `PartyRoomPage` (tab 💬 Chat), reutilizando componentes y estilos existentes.
- Se agregó soporte de **mocks** para mensajes cuando el backend no responde durante desarrollo.
- Se alineó el **realtime chat** por Socket.IO entre frontend y backend (evento + payload).
- Se corrigió el flujo de **matchmaking**: ahora se envía `matchId` al aceptar/rechazar y se emite progreso de confirmación.

## Cambios principales
### Chat UI (frontend)
- Lista de mensajes + input + botón enviar.
- Scroll automático al último mensaje y estado vacío.
- Diferenciación visual de mensajes propios.

### Realtime chat (frontend + backend)
- `party:join` ahora envía el payload correcto `{ partyId }`.
- Envío por WS `party:chat` y escucha `chat:message`.
- Payload `chat:message` alineado al tipo `ChatMessage` del frontend.

### Matchmaking (frontend + backend)
- `match:accept` ahora envía `{ matchId }`.
- El backend emite `match:confirmed` con `{ count }`.
- El frontend tolera `match:ready` tanto como `Party` directo como `{ partyId, party }`.

## Archivos tocados
### Frontend
- `frontend/src/pages/PartyRoomPage.tsx`
- `frontend/src/components/PartyComponents.tsx`
- `frontend/src/hooks/useParty.ts`
- `frontend/src/pages/MatchmakingPage.tsx`
- `frontend/src/index.css`
- `frontend/src/services/mock/partyService.mock.ts` (nuevo)

### Backend
- `backend/src/gateways/matchmaking/matchmaking.gateway.ts`
- `backend/src/gateways/matchmaking/matchmaking.service.ts`
- `backend/src/modules/parties/parties.service.ts`

## Test plan
- [ ] Loguearse y abrir una party `/party/:partyId` → tab **💬 Chat**.
- [ ] Enviar un mensaje y verificar que aparece en pantalla.
- [ ] Abrir 2 pestañas en la misma party y validar realtime (`chat:message`).
- [ ] En 2 sesiones distintas: `/matchmaking` → aceptar match en ambas → ver progreso (`match:confirmed`) y navegación a `/party/:partyId`.

