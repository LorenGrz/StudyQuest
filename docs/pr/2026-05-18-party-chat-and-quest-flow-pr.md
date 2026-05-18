# PR Draft: Rich Party Chat + Quest IA + Reintentos

## Resumen

Esta rama consolida mejoras grandes en dos áreas principales:

- chat de party con mensajes ricos (`text`, `file`, `audio`)
- flujo completo de quests con IA, incluyendo generación real, play sin mocks, reintentos, reanudación y score visible

También incluye una capa de abstracción multi-provider para IA, mejoras de UX en la creación de quests y limpieza de estados engañosos en frontend.

## Qué incluye

### 1. Rich party chat

- Soporte persistente y realtime para mensajes de texto, archivo y audio.
- Archivos y audios subidos por REST y difundidos al room por websocket.
- Render de links de archivo y player inline de audio.
- Composer mobile más cercano a WhatsApp.
- Fixes de CORS y resolución de URLs de adjuntos.

### 2. Quests con IA reales

- Generación de quests desde texto o PDF usando provider configurable.
- Título usado como guía de foco; texto/PDF como fuente principal.
- Play del quiz conectado al backend real también en `dev`.
- Visualización del PDF fuente desde la card de la quest.

### 3. Capa multi-provider de IA

- Arquitectura desacoplada para providers de quizzes.
- Soporte actual para:
  - `gemini`
  - `openai`
  - `anthropic`
  - `groq`
  - `mock`
- Configuración por `.env` sin acoplar `QuestsService` a un SDK concreto.

### 4. Reintentos y reanudación de quests

- Una quest puede ejecutarse múltiples veces por usuario.
- Si un usuario sale en medio de un intento, al volver reanuda el progreso.
- Si un intento ya terminó, puede iniciar uno nuevo.
- El frontend muestra:
  - score del intento actual
  - mejor score histórico
  - estado `En curso` / `Completada`
  - cantidad real de preguntas

### 5. UX y confiabilidad

- Las quests en estado `generating` ahora se muestran explícitamente como `Generando con IA...`.
- Mientras una quest se genera, no se puede abrir para jugar.
- La lista hace polling liviano hasta que la generación termine.
- Si el chat falla al cargar, ya no cae silenciosamente a mocks.
- Se ocultó por ahora la sección de `Progreso de estudio` del dashboard.

## Cambios técnicos importantes

### Backend

- `PlayerResult` evolucionó para soportar múltiples intentos por `questId + userId`.
- Nuevos datos por intento:
  - `attemptNumber`
  - `status`
  - `answeredQuestionIndices`
  - `totalQuestions`
  - `completedAt`
- Endpoints de quests ahora contemplan contexto del usuario:
  - listado por party con resumen personal
  - play con intento activo y score
  - start que crea o reanuda intento
  - answer asociado al intento activo
  - complete por intento

### Frontend

- `useQuiz` ya no asume una sola ejecución por quest.
- `QuestCard` muestra estado real, score y fuente.
- `useQuests` refresca quests en generación.
- `useParty` expone error real de carga.

## Pruebas corridas

### Backend

- `npm run build`
- `npm test -- --runInBand src/modules/quests/quests.attempts.spec.ts src/modules/quests/quests.service.spec.ts src/modules/parties/parties.service.spec.ts src/modules/parties/parties.controller.spec.ts`

### Frontend

- `npm run build`
- `npm test -- src/hooks/useQuiz.test.ts src/components/QuestCard.test.tsx src/hooks/useParty.test.ts src/components/UploadNoteCard.test.tsx src/services/questService.test.ts`

### Verificación manual / integración

- Quest real:
  - crear
  - quedar en `generating`
  - pasar a `ready`
  - iniciar intento
  - responder parcialmente
  - salir
  - volver y reanudar
  - completar
  - volver a ejecutar con nuevo intento
- Chat realtime entre Alice y Bob:
  - texto recibido por ambos
  - audio recibido por ambos
  - URL de audio accesible con `200`

## Cosas a tener en cuenta al revisar

- La tabla `player_results` cambió semánticamente: ya no representa un solo resultado final por usuario/quest, sino intentos.
- Para datos viejos, se agregó compatibilidad parcial para no tratar resultados legacy como intentos activos reanudables.
- El quest global sigue usando `status`, pero el progreso del usuario ahora vive en los intentos.

## Sugerencia de revisión

1. Revisar rich chat y websocket delivery.
2. Revisar creación de quest con IA desde texto y PDF.
3. Revisar intento parcial + reanudación.
4. Revisar score final y score visible en la lista.
5. Revisar que las quests `generating` no se puedan abrir.
