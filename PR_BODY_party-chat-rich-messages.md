## Resolves

Closes #34  
Closes #35

## What changed

- agrega rich chat de party con soporte realtime para `text`, `file` y `audio`
- corrige el flujo de creación de quests con IA desde texto y PDF
- desacopla la capa de quizzes de un proveedor único de IA
- agrega soporte multi-provider para `gemini`, `openai`, `anthropic`, `groq` y `mock`
- conecta el play del quiz al backend real también en desarrollo
- soporta reintentos de quest, reanudación de intentos en curso y score visible
- mejora la UX para quests en estado `generating`
- elimina el fallback silencioso del chat a mensajes mock
- oculta por ahora la sección de `Progreso de estudio` del dashboard

## Multi-provider IA

La generación de quizzes ya no queda acoplada a un SDK concreto.  
`QuestsService` usa una fachada de IA y el provider se elige con `AI_PROVIDER`.

Providers soportados:

- `gemini`
- `openai`
- `anthropic`
- `groq`
- `mock`

Ejemplos de configuración:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=tu_api_key
GEMINI_MODEL=gemini-1.5-flash
```

```env
AI_PROVIDER=openai
OPENAI_API_KEY=tu_api_key
OPENAI_MODEL=gpt-4.1-mini
```

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=tu_api_key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

```env
AI_PROVIDER=groq
GROQ_API_KEY=tu_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

```env
AI_PROVIDER=mock
```

Notas:

- las API keys viven del lado del backend
- si cambiás provider o modelo, reiniciá el backend
- frontend no cambia según el provider; consume el mismo backend

## How to run

1. Copiar variables:

```bash
cp .env.example .env
```

2. Completar las credenciales del provider de IA que quieras usar.

3. Levantar infraestructura:

```bash
docker compose up -d postgres redis
```

4. Levantar backend:

```bash
cd backend
npm install
npm run start:dev
```

5. Seed:

```bash
npm run seed
```

6. Levantar frontend:

```bash
cd frontend
npm install
npm run dev
```

## How to test

1. Crear una party o entrar a una existente.
2. En `Quests`, crear una quest:
   - pegando texto largo
   - o subiendo un PDF
3. Verificar que:
   - inicialmente aparezca como `Generando con IA...`
   - no se pueda abrir mientras genera
   - luego cambie a `ready`
4. Abrir la quest y verificar:
   - botón para volver
   - si salís en medio del intento, al volver reanuda
   - al completar muestra score del intento y mejor score
   - podés volver a ejecutar la quest
5. En `Chat`, verificar entre dos usuarios:
   - texto realtime
   - adjunto realtime
   - audio realtime

## Verification run

- backend: `npm run build`
- frontend: `npm run build`
- backend tests:
  - `npm test -- --runInBand src/modules/quests/quests.attempts.spec.ts src/modules/quests/quests.service.spec.ts src/modules/parties/parties.service.spec.ts src/modules/parties/parties.controller.spec.ts`
- frontend tests:
  - `npm test -- src/hooks/useQuiz.test.ts src/components/QuestCard.test.tsx src/hooks/useParty.test.ts src/components/UploadNoteCard.test.tsx src/services/questService.test.ts`

## Checklist

- [x] Linked issues are included
- [x] Changes were tested
- [x] Relevant docs were updated
