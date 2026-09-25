# Handoff: Issue #136 - Sistema de Recomendaciones de Quests

**Última actualización:** 2 de junio de 2026  
**Estado:** Análisis y diseño completado. Listo para implementación.

---

## Objetivo de la issue

Implementar un servicio de recomendaciones que sugiera quests basándose en:
1. **Materias inscriptas** del usuario
2. **Quests ya jugadas** (para excluirlas)

Enfoque: **reglas simples sin machine learning**.

**Endpoint objetivo:**
```
GET /api/v1/users/me/recommended-quests?page=1&limit=10&subjectId=<uuid>
```

**Respuesta esperada:**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "string",
      "subjectId": "uuid",
      "subjectName": "string",
      "partyId": "uuid",
      "status": "ready|active|completed",
      "createdAt": "ISO date",
      "playCount": number
    }
  ],
  "total": number,
  "page": number,
  "limit": number,
  "totalPages": number
}
```

---

## Investigación realizada

### Entidades verificadas

#### 1. User
```typescript
// Propiedades relevantes
@Column() id: string (UUID)
@Column() email: string
@Column() username: string

// Relaciones
@ManyToMany(() => Subject)
enrolledSubjects: Subject[]  // ✅ Cargable con .relations(['enrolledSubjects'])
```

#### 2. Subject
```typescript
// Propiedades relevantes
@Column() id: string (UUID)
@Column() name: string
@Column({ name: 'is_active', default: true }) isActive: boolean  // ✅ CRÍTICO para filtrado

// Relaciones
@ManyToMany(() => User, u => u.enrolledSubjects)
enrolledBy: User[]
```

#### 3. Quest
```typescript
// Propiedades relevantes
@Column() id: string (UUID)
@Column({ length: 200 }) title: string
@Column({ name: 'party_id' }) partyId: string
@Column({ name: 'subject_id' }) subjectId: string
@Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
@Column({ 
  type: 'enum', 
  enum: ['generating', 'ready', 'active', 'completed', 'failed'] 
}) status: QuestStatus

// Relaciones
@ManyToOne(() => Subject)
subject: Subject  // ✅ Para acceder a subject.name y subject.isActive

@OneToMany(() => PlayerResult, r => r.quest)
results: PlayerResult[]  // ✅ Para contar cuántas veces fue jugado
```

#### 4. PlayerResult
```typescript
// Propiedades relevantes
@Column() id: string (UUID)
@Column({ name: 'quest_id' }) questId: string
@Column({ name: 'user_id' }) userId: string
@Column({
  type: 'enum',
  enum: ['in_progress', 'completed', 'abandoned']
}) status: string
@Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date

// Relaciones
@ManyToOne(() => Quest, q => q.results)
quest: Quest
```

### Relaciones verificadas

| Relación | Tipo | Verificación |
|----------|------|--------------|
| User → enrolledSubjects | ManyToMany | ✅ Confirmada, cargable |
| Quest → subject | ManyToOne | ✅ Confirmada, @JoinColumn({ name: 'subject_id' }) |
| Quest → results | OneToMany | ✅ Confirmada, cascade: true |
| Subject → isActive | Column | ✅ Confirmada, default: true |
| PlayerResult → questId | Column | ✅ Confirmada, FK a Quest |

---

## Datos disponibles para recomendaciones

### Por qué es suficiente para versión 1

El sistema actual proporciona **toda la información necesaria** sin necesidad de ML:

1. **Materias inscritas** → Filtrado automático de scope
   - `user.enrolledSubjects` es un ManyToMany cargado en memoria

2. **Quests jugadas** → Historial completo
   - `PlayerResult` registra cada intento de cada usuario
   - Es la fuente de verdad para "quests ya jugadas"

3. **Popularidad relativa** → Sin algoritmo complejo
   - `COUNT(DISTINCT result.id)` en cada quest = "cuántas veces fue jugado"
   - La BD deduplica automáticamente (un user jugó el quest N veces)

4. **Recencia** → Información de timestamp
   - `quest.createdAt` es automática con @CreateDateColumn

5. **Filtrado de materias activas** → Garantiza solo recomendaciones válidas
   - `subject.isActive = true` excluye materias que no están disponibles

6. **Estados de quest válidos** → Ya están enum validados
   - Solo recomendamos: `['ready', 'active', 'completed']`
   - Excluimos: `['generating', 'failed']`

**Conclusión:** No necesitamos tablas adicionales, cálculos en cache, ni puntuaciones precalculadas. Los datos existen y están relacionados correctamente.

---

## Algoritmo acordado

### Paso a paso

```
1. Cargar usuario con materias inscriptas
   ├─ User.load(enrolledSubjects)
   └─ Obtener lista de subjectIds inscritos

2. Obtener IDs de quests ya jugadas por el usuario
   ├─ PlayerResult.find({ userId: string })
   ├─ SELECT DISTINCT questId (deduplicación en BD, no en memoria)
   └─ Retornar array de questIds únicos

3. Construir Query 1: Contar total de quests disponibles
   ├─ SELECT COUNT(DISTINCT q.id)
   ├─ WHERE q.subjectId IN (inscritas)
   ├─ AND q.status IN ('ready', 'active', 'completed')
   ├─ AND q.id NOT IN (ya jugadas)
   ├─ AND subject.isActive = true
   └─ RESULTADO: total para paginación

4. Construir Query 2: Obtener quests con play count
   ├─ SELECT q.id, q.title, q.partyId, q.subjectId, q.createdAt
   ├─ COUNT(DISTINCT result.id) AS playCount
   ├─ Mismos filtros que Query 1
   ├─ GROUP BY q.id, subject.name
   ├─ ORDER BY playCount DESC, q.createdAt DESC
   └─ LIMIT offset, limit

5. Paginar y construir respuesta
   ├─ Normalizar parámetros (page, limit, offset)
   ├─ Transformar raw SQL a RecommendedQuestDto[]
   └─ Retornar RecommendedQuestsResponseDto

6. Aplicar filtro opcional por materia
   └─ Si ?subjectId=X, adicionar AND q.subjectId = X a ambas queries
```

### Flujo de datos

```
GET /users/me/recommended-quests?page=1&limit=10
    │
    ├─→ UsersController.getRecommendedQuests()
    │   └─→ req.user.userId extraído de JWT
    │
    ├─→ UsersService.getRecommendedQuests(userId, page, limit, subjectId?)
    │   │
    │   ├─→ Query 1: COUNT(DISTINCT q.id)
    │   │   └─→ Int: total
    │   │
    │   ├─→ Query 2: SELECT q.*, COUNT(result.id) GROUP BY
    │   │   └─→ Array<RawResult>
    │   │
    │   └─→ Construir RecommendedQuestsResponseDto
    │
    └─→ Response JSON 200 OK
```

---

## Decisiones técnicas

### Decisión 1: Dos queries separadas en lugar de getCount() + GROUP BY

**Problema identificado:**

TypeORM `getCount()` con `GROUP BY` produce conteos incorrectos:

```typescript
// ❌ INCORRECTO - cuenta filas, no quests únicos
qb.select('q.id')
  .leftJoinAndSelect('q.results', 'result')
  .groupBy('q.id')
  .getCount()  // Si quest tiene 5 results → cuenta 5 veces
```

Cuando hay un LEFT JOIN y un GROUP BY, `getCount()` cuenta las **filas del resultado final**, no las entidades únicas.

**Solución implementada:**

```typescript
// ✅ CORRECTO - Query separada sin GROUP BY
const countQb = this.questRepo.createQueryBuilder('q')
  .select('COUNT(DISTINCT q.id)', 'total')
  .where(/* filtros */)
  .getRawOne();

const total = parseInt(countResult.total, 10);

// ✅ CORRECTO - Query con GROUP BY solo para datos
const quests = this.questRepo.createQueryBuilder('q')
  .addSelect('COUNT(DISTINCT result.id)', 'playCount')
  .groupBy('q.id')
  .where(/* filtros */)
  .getRawMany();
```

**Beneficios:**
- Conteo exacto sin ser afectado por el LEFT JOIN
- Mismos filtros en ambas queries
- Patrón estándar en aplicaciones TypeORM

### Decisión 2: DISTINCT en BD vs deduplicación en JavaScript

**Problema identificado:**

PlayerResult puede contener múltiples registros para el mismo user + quest (si jugó varias veces):

```typescript
// ❌ INEFICIENTE - carga en memoria
const results = await playerResultRepo.find({ where: { userId } });
const uniqueQuestIds = [...new Set(results.map(r => r.questId))];
```

Esto carga potencialmente **cientos de registros** en memoria solo para deduplicar.

**Solución implementada:**

```typescript
// ✅ EFICIENTE - deduplicación en BD
const playedQuestIds = await this.playerResultRepository
  .createQueryBuilder('result')
  .select('DISTINCT result.questId', 'questId')
  .where('result.userId = :userId', { userId })
  .getRawMany()
  .then(results => results.map(r => r.questId));
```

SQL generado:
```sql
SELECT DISTINCT quest_id 
FROM player_results 
WHERE user_id = $1
```

**Beneficios:**
- Deduplicación a nivel de BD (es su especialidad)
- Solo retorna N registros únicos, no N×jugadas
- Una sola round-trip
- Más escalable con cientos de quests jugados

### Decisión 3: Filtro subject.isActive (no q.is_active)

**Problema identificado:**

Quest no tiene propiedad `isActive`. Solo existe en Subject:

```typescript
// ❌ INCORRECTO - columna no existe
.andWhere('q.is_active = true')

// ✅ CORRECTO - filtrar por materia activa
.andWhere('subject.isActive = true')
```

Esto garantiza que solo recomendamos quests de materias activas.

---

## Plan de implementación

### Paso 1: Implementar método getRecommendedQuests() en UsersService

**Archivo:** `backend/src/modules/users/users.service.ts`

**Cambios:**
- Inyectar repositories: `Quest` y `PlayerResult`
- Implementar método `getRecommendedQuests()`
- Aplicar soluciones identificadas:
  - Query 1 para contar (COUNT DISTINCT)
  - Query 2 para datos (con GROUP BY)
  - DISTINCT para questIds jugados
  - Filtro subject.isActive
  - Normalización de paginación

**Complejidad:** Media (45-50 líneas)

### Paso 2: Registrar repositories en UsersModule

**Archivo:** `backend/src/modules/users/users.module.ts`

**Cambios:**
- Agregar `Quest` a imports de TypeOrmModule.forFeature()
- Agregar `PlayerResult` a imports de TypeOrmModule.forFeature()

**Complejidad:** Trivial (2 líneas)

### Paso 3: Crear DTOs

**Archivo:** `backend/src/common/dto/index.ts`

**Crear clases:**

1. `RecommendedQuestsQueryDto`
   ```typescript
   export class RecommendedQuestsQueryDto {
     @IsOptional()
     @IsNumber()
     page?: number = 1;
     
     @IsOptional()
     @IsNumber()
     limit?: number = 10;
     
     @IsOptional()
     @IsUUID()
     subjectId?: string;
   }
   ```

2. `RecommendedQuestDto`
   ```typescript
   export class RecommendedQuestDto {
     id: string;
     title: string;
     subjectId: string;
     subjectName: string;
     partyId: string;
     status: string;
     createdAt: Date;
     playCount: number;
   }
   ```

3. `RecommendedQuestsResponseDto`
   ```typescript
   export class RecommendedQuestsResponseDto {
     items: RecommendedQuestDto[];
     total: number;
     page: number;
     limit: number;
     totalPages: number;
   }
   ```

**Complejidad:** Baja (25-30 líneas)

### Paso 4: Agregar endpoint en UsersController

**Archivo:** `backend/src/modules/users/users.controller.ts`

**Agregar método:**

```typescript
@Get('me/recommended-quests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'limit', required: false, type: Number })
@ApiQuery({ name: 'subjectId', required: false, type: String })
@ApiOkResponse({ type: RecommendedQuestsResponseDto })
getRecommendedQuests(
  @Request() req: any,
  @Query() query: RecommendedQuestsQueryDto,
) {
  return this.usersService.getRecommendedQuests(
    req.user.userId,
    query.page,
    query.limit,
    query.subjectId,
  );
}
```

**Complejidad:** Baja (10-12 líneas)

### Paso 5: Tests (opcional para esta entrega)

**Archivos a crear:**
- `backend/src/modules/users/users.service.getRecommendedQuests.spec.ts`

**Casos de prueba:**
- Usuario sin materias inscritas → array vacío
- Usuario sin quests jugados → todos disponibles
- Usuario con quests jugados → excluye los jugados
- Filtro por subjectId
- Paginación correcta
- Materias inactivas excluidas
- Estados de quest inválidos excluidos

**Complejidad:** Media-Alta (40-50 líneas por 6-8 tests)

---

## Próximo prompt sugerido

Cuando retomes el trabajo, usa este prompt exacto para continuar:

```
Generá ahora la implementación completa del método getRecommendedQuests() 
en UsersService incorporando:

1. COUNT(DISTINCT q.id) en query separada para total exacto
2. DISTINCT questId para obtener IDs jugados sin duplicados en BD
3. Filtro subject.isActive = true (no q.is_active que no existe)
4. Filtros de status válidos: ['ready', 'active', 'completed']
5. Parámetros: userId, page, limit, subjectId (opcional)
6. Retorno: RecommendedQuestsResponseDto con items, total, page, limit, totalPages

Cambios necesarios:
- Inyectar Quest y PlayerResult repositories en constructor
- Implementar getRecommendedQuests() con ambas queries
- Aplicar Transform y parseo de playCount como número

Mostrame:
- El código completo del método (sin cambios en controller ni module)
- Los cambios en el constructor solo para las nuevas inyecciones
- Explicación brevísima de la implementación

NO modifiques todavía:
- users.controller.ts
- users.module.ts
- DTOs
```

---

## Checklist de implementación

- [ ] Paso 1: Implementar getRecommendedQuests() en UsersService
- [ ] Paso 2: Registrar repositories en UsersModule
- [ ] Paso 3: Crear DTOs en common/dto/index.ts
- [ ] Paso 4: Agregar endpoint en UsersController
- [ ] Paso 5: Tests unitarios (opcional)
- [ ] Verificación: Testear endpoint manualmente con curl/Postman
- [ ] Verificación: Revisar paginación con offset/limit
- [ ] Verificación: Confirmar deduplicación de PlayerResult
- [ ] Verificación: Confirmar conteo exacto sin duplicados

---

## Referencias útiles

### Archivos críticos del repositorio

- `backend/src/modules/users/users.service.ts` — Dónde agregar método
- `backend/src/modules/users/users.controller.ts` — Dónde agregar endpoint
- `backend/src/modules/users/users.module.ts` — Dónde registrar repositories
- `backend/src/common/dto/index.ts` — Dónde crear DTOs
- `backend/src/modules/quests/quest.entity.ts` — Validar estructura
- `backend/src/modules/quests/player-result.entity.ts` — Validar estructura
- `backend/src/modules/subjects/subject.entity.ts` — Validar isActive

### Comandos útiles para retomar

```bash
# Iniciar backend en dev
cd backend && npm run start:dev

# Ver Swagger docs
http://localhost:3000/docs

# Testear endpoint manualmente
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/users/me/recommended-quests?page=1&limit=10"
```

---

## Notas importantes

1. **Sin cambios en DB:** Este feature usa relaciones existentes, sin necesidad de migrations.

2. **Paginación:** Usar offset = (page - 1) * limit. El frontend recibe page (1-indexed).

3. **Total único:** Usar COUNT(DISTINCT q.id) en query separada, no getCount() con GROUP BY.

4. **Deduplicación en BD:** SELECT DISTINCT questId es más eficiente que JavaScript.

5. **Filtro de materia activa:** Crítico para no recomendar materias descontinuadas.

6. **Orden determinista:** playCount DESC, createdAt DESC = trending + recientes primero.

---

**Generado:** 2 de junio de 2026  
**Próxima sesión:** Usar el prompt sugerido en la sección "Próximo prompt sugerido"
