# Handoff — StudyQuest (actualizado 2026-09-30)

Punto de entrada para retomar el trabajo en una sesión nueva. Leé esto, después el `CLAUDE.md` del proyecto y el plan activo.

- **Plan:** [`2026-09-community-subjects.md`](./2026-09-community-subjects.md) (catálogo oficial de carreras + materias de la comunidad). **Desplegado en prod el 2026-09-30** (`dev` @ `6924302`).
  - T5 hecho:
    - backup `s3://studyquest-files-493735739644/backups/studyquest-2026-09-30T18-42-47Z.dump.gz`;
    - 3 migraciones (`1790500000000`, `1790510000000`, `1790600000000`);
    - `careers:sync`: 601 cambios, la 2ª corrida da 0;
    - `seed-official`: 514 materias (464 nuevas + 50 promovidas), la 2ª corrida da 0; 7 legacy activas intactas;
    - smoke OK: registro con carrera y con "Otra", suggest, materia privada, insulto rechazado y llamada real a Nova Lite (589 ms). Las cuentas de prueba se borraron.
  - Estado en prod:
    - 9 usuarios, todos vinculados a una universidad;
    - sus carreras legacy quedaron `retired`, así que tienen que elegirla de nuevo en el perfil;
    - UNC "Ingeniería en Sistemas de Información" no existe como carrera.
  - **Pendiente:**
    - la rutina trimestral de `careers:sync` (`/schedule`), que espera el OK de Loren;
    - borrar las ramas y worktrees `catalog-*`, `agent-*` y `feature/community-subjects*`.
  - **Deuda:**
    - cualquier usuario logueado puede crear skill nodes;
    - el picker de merge del admin solo lista la pestaña actual;
    - los errores de lint `set-state-in-effect` en los hooks nuevos (patrón existente);
    - `GET /subjects/:id` para materias fusionadas devuelve la materia destino, con otro `id`.

## Qué está en producción

- **Infra AWS:**
  - Lightsail `studyquest`: `54.156.9.166`, API en `https://api-54-156-9-166.sslip.io`.
  - S3 `studyquest-files-493735739644`, DynamoDB `studyquest-quizzes`, Bedrock.
  - Detalle en `CLAUDE.md` → "Branches & deploy".
- **Dashboard:** "Quests para hoy" y "Recomendados" son colapsables y la búsqueda flota (`components/UI.tsx` `Collapsible`, `hooks/useQuestsToday.ts`, `hooks/useRecommendedQuests.ts`).
- **Rankings:**
  - Global / Por universidad (con selector) / Por materia, más "Tu posición".
  - `GET /users/leaderboard/{global,universities,me,:subjectId}`.
  - Migración `1790150000000-AddUsersUniversityIndex`.
- **Mercado Pago:**
  - Checkout Pro + webhook, con arreglos de una revisión de seguridad a ciegas.
  - Desplegado pero **inactivo**: sin `MP_*` en el `.env` de la instancia, el botón no aparece y el checkout devuelve 503.
  - Código en `backend/src/modules/billing/payments/`, migraciones `1790200000000` a `1790400000000`.
- **Usernames y universidad:** usernames siempre en minúsculas y con `@` fijo en la UI. Universidad elegida desde un select.
- **Throttling:** el throttler `strict` es opt-in (`common/throttle.ts`) y `trust proxy` = 1.

## Runbook T5: rollout de catálogo + materias de la comunidad

Requiere OK de Loren antes de tocar prod. SSH: `ssh -i <lightsail.pem> ubuntu@54.156.9.166`. `C` = `docker compose -f /opt/studyquest/deploy/lightsail/docker-compose.prod.yml --env-file /opt/studyquest/deploy/lightsail/.env`.

1. **Antes de mergear**, revisar los strings de universidad que hay en prod (el backfill solo crea universidades a partir de `subjects.university`):
   `$C exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT university, count(*) FROM users GROUP BY 1 ORDER BY 2 DESC"'`
2. **Merge:** `feature/community-subjects` → `dev` con `--no-ff`. El push a `dev` despliega el frontend (W1/W2/W3) en GH Pages; el backend tiene que desplegarse enseguida, porque el registro nuevo depende de `/universities`.
3. **Backup:** `/opt/studyquest/deploy/lightsail/backup.sh`, y confirmar que el dump quedó en `s3://…/backups/`.
4. **Deploy:** `/opt/studyquest/deploy/lightsail/deploy.sh` corre las migraciones `1790500000000`, `1790510000000`, `1790600000000` y después `careers:sync`. Revisar en el log las altas y retiros de carreras.
5. **Materias oficiales:**
   - `$C exec -T api node dist/database/scripts/seed-official-subjects.js --dry-run`: se esperan ~562 materias (nuevas + promovidas), 0 errores, y ninguna legacy activa modificada.
   - Si todo está bien, correrlo sin `--dry-run` y después otra vez con `--dry-run`, que tiene que dar `Cambios: 0`.
6. **Smoke en prod:**
   - registro con UNSAM → Lic. en Desarrollo de Software;
   - registro con "Otra" → aparece en `/admin`;
   - crear "Taller de Tesis" → queda privada;
   - intentar un insulto → rechazado;
   - `/subjects/suggest?q=analisis 1` → encuentra "Análisis I".
7. **Rollback:**
   - revertir las 3 migraciones en orden inverso: `$C exec -T api node_modules/.bin/typeorm migration:revert -d dist/config/typeorm.config.js` ×3;
   - hacer `git revert` del merge en `dev`;
   - en último caso, restaurar el dump del paso 3.
8. **Cierre:**
   - borrar las ramas y worktrees `catalog-*` y `agent-*`;
   - `dev` → `master` con `--no-ff`;
   - actualizar CLAUDE.md y AGENTS.md;
   - crear la rutina trimestral (`/schedule`).

## Pendiente de Loren: activar Mercado Pago

1. En developers.mercadopago.com.ar, con la cuenta del alias `lorenzograizzaro.mp`, crear una app "Pagos online" → Checkout Pro.
2. Crear usuarios de prueba: un vendedor y un comprador.
3. En Webhooks (modo prueba):
   - URL: `https://api-54-156-9-166.sslip.io/api/v1/payments/webhook`
   - Evento: solo **Pagos**.
   - Copiar la clave secreta.
4. Pasar por archivo, no por chat, el Access Token `TEST-…` del vendedor de test y la clave secreta.
5. En `/opt/studyquest/deploy/lightsail/.env`, setear:
   - `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_SANDBOX=true`
   - `PRO_USD_PRICE=5`, `PRO_PRICE_ARS_FALLBACK`
   - `PUBLIC_API_URL`, `FRONTEND_URL`

   Después correr `deploy.sh` y probar con la tarjeta de test Mastercard `5031 7557 3453 0604`, titular `APRO`.
6. Para producción: activar las credenciales `APP_USR-…` con `MP_SANDBOX=false` y configurar el webhook en modo producción.

## Catálogos investigados (ramas en `origin`, sin mergear)

Cada rama agrega `backend/src/database/seeds/data/catalog/<uni>.ts` + `<uni>.sources.md` + `index.ts` + `validate-catalog.ts`. Los `index.ts`/`validate-catalog.ts` chocan entre ramas: consolidarlos en C2.

| Rama | Commit | Contenido | Verificación |
|---|---|---|---|
| `feature/catalog-unlam` | 7a00d49 | Ing. Informática 57, Tec. Web 20, Tec. Apps Móviles 20 | 15/15 OK |
| `feature/catalog-unsam` | 3880ce5 | 9 carreras / 298 materias (Lic. Desarrollo de Software, TUPI, TU Redes, Lic. Ciencia de Datos, 4 ingenierías, Biotecnología) | 20/20 OK. Corregir "Análisis 1"→"Análisis I" y "Programación 1"→"Programación I". **No** usar su reasignación posicional de códigos |
| `feature/catalog-utn-frba` | ec2203a | ISI plan 2023 44, Tec. Univ. en Programación 18, Industrial, Electrónica, Mecánica, Química (230) | 12/12 OK |
| `feature/catalog-uba` | ce2fc1f | Ciencias de la Computación 30, Lic. Ciencia de Datos 25, Ing. Informática 35 (CBC = año 1) | 12/12 OK |
| `feature/catalog-unc` | 8de60db | LCC 27, Analista en Computación 19, Ing. Computación 42, + Civil, Mecánica, Química, Contador (257) | 12/12 OK. "Ing. en Sistemas" **no existe** en UNC |
| `feature/catalog-unlp` | 6260ae8 | Lic. Informática, Lic. Sistemas, APU, ATIC, Ing. Computación, Ciencia de Datos en Organizaciones + Abogacía, Contador, Veterinaria (336) | 16/16 OK |
| `feature/catalog-unr` | cc29a34 | Lic. Cs. Computación 33 (PDF escaneado), Lic. Ciencia de Datos 35 (fuente en Drive), Tec. Univ. en IA 26 | IA 4/4 OK; las otras 2 **sin verificar** por herramientas de texto |

**Pendientes de investigación** (ya no hacen falta con el nuevo modelo):
- 15 carreras no informáticas de UBA;
- Medicina, Derecho, Psicología y Arquitectura de UNC (anti-bot);
- 4 carreras de UNR;
- 3 carreras de UNSAM que ya no aparecen en su oferta.

Para C1 alcanza con los **nombres** de carreras.

## Cómo trabajar

- **Ramas:** `dev` es el default y un push despliega el frontend (GH Pages). El backend se despliega a mano:
  - `ssh -i <lightsail.pem> ubuntu@54.156.9.166 /opt/studyquest/deploy/lightsail/deploy.sh`
  - La key se baja con `aws lightsail download-default-key-pair`.
- **Antes de migraciones en prod:** correr `/opt/studyquest/deploy/lightsail/backup.sh` (sube un dump a S3 `backups/`).
- **`master`:** mergear `dev` → `master` con `--no-ff` y actualizar `CLAUDE.md` (regla global).
- **Subagentes** (tabla de Agent Routing en `~/.claude/CLAUDE.md`):
  - Máximo **3 en paralelo**: con 5 el límite de uso cortó varias veces y hubo que reanudar.
  - Cada subagente recibe su comando de acceptance.
  - Lo riesgoso (pagos, migraciones de datos) lleva una revisión ciega de un 2º `reasoner`.
- **Scout:** es de solo lectura por un hook (`~/.claude/hooks/scout-readonly.sh`, registrado en `settings.json` filtrado por `agent_type`).
- **Permisos AWS:** los comandos que modifican están en `permissions.ask`.
- **Checks:**
  - backend: `pnpm test && pnpm build`. El lint del backend está roto (falta la config de ESLint 9).
  - frontend: `pnpm test && pnpm build` + `eslint` sobre los archivos tocados (el lint global tiene errores previos).
- **Lockfiles:** el `pnpm-lock.yaml` de la raíz no se regenera con el pnpm global (v12). CI usa pnpm 11 y los lockfiles de `backend/` y `frontend/`.

## Deuda conocida

- Lint del backend sin config de ESLint 9; errores previos de lint en el frontend.
- `seed.ts` no es seguro en prod: hace `DROP TABLE` de cosméticos, llama a `synchronize()` y crea usuarios demo. En prod solo se usan migraciones y scripts dedicados.
- Las contraseñas de las cuentas del seed (admin + 7 demo) se rotaron en prod el 2026-09-26. La del admin está en poder de Loren.
- Mercado Pago no revoca automáticamente, salvo reembolsos y contracargos, que ya descuentan los días.
