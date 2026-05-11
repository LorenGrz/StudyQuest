# Skill Tree – Implementation Plan

Branch: `feature/skill-tree`  
Base branch: `dev`

## Overview

Each **Subject** gets a directed acyclic graph of **SkillNodes** (topics like "Derivatives", "Integrals", etc.). As users answer quiz questions correctly, they accumulate XP per topic. When a node's XP threshold is reached, it **unlocks**. Prerequisite nodes must be unlocked before later ones can progress.

The critical bridge is `QuizQuestion.topic` (already populated by the AI service). No existing entity schemas change; only new tables and a hook inside `QuestsService.submitAnswer` are added.

---

## Existing Codebase Context

Agents writing code should be aware of these conventions:

- **ORM**: TypeORM with `synchronize: true` in dev, migrations for prod. All entities are in `backend/src/modules/<module>/*.entity.ts` and auto-discovered via glob.
- **Modules**: Each feature is a NestJS module. Import `TypeOrmModule.forFeature([...])` for its entities, then register in `app.module.ts`.
- **Guards**: `JwtAuthGuard` is applied at controller level with `@UseGuards(JwtAuthGuard)`. User ID is at `req.user.userId`.
- **DTOs**: All DTOs live in `backend/src/common/dto/index.ts` with `class-validator` decorators and `@ApiProperty` for Swagger.
- **XP system**: Global XP lives in `User.stats` (JSONB) and is updated via raw SQL in `UsersService.addXp()`. Topic XP is separate and lives in `UserSkillProgress`.
- **Events**: `EventEmitter2` is already wired in `QuestsService`; use `this.eventEmitter.emit(...)` for async side effects.
- **Frontend state**: Zustand stores in `frontend/src/store/`. API calls use the pre-configured `api` axios instance from `frontend/src/services/api.ts` (auto-attaches JWT, handles 401 refresh).
- **Styling**: CSS utility classes (`btn`, `badge`, `spinner`, `section-title`, etc.) are defined globally. New components should follow the same pattern as `frontend/src/components/UI.tsx`.
- **Language**: All user-facing strings are in **Spanish**.

---

## Phase 1 – Backend Entities

### 1.1 `SkillNode` entity

**File**: `backend/src/modules/skill-tree/skill-node.entity.ts`

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Subject } from '../subjects/subject.entity';

@Entity('skill_nodes')
@Index(['subjectId', 'position'])
export class SkillNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_id' })
  @Index()
  subjectId: string;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  /** Must match QuizQuestion.topic exactly (case-insensitive lookup in service). */
  @Column({ length: 200 })
  topic: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  /** Icon identifier resolved on the frontend (e.g. "sigma", "atom"). */
  @Column({ name: 'icon_key', length: 50, default: 'star' })
  iconKey: string;

  /** Total topic XP a user needs to unlock this node. */
  @Column({ name: 'xp_threshold', default: 100 })
  xpThreshold: number;

  /** IDs of SkillNodes that must be unlocked before this one can be unlocked. */
  @Column({ name: 'prerequisite_ids', type: 'jsonb', default: [] })
  prerequisiteIds: string[];

  /** X/Y grid position for frontend rendering (0-based column/row). */
  @Column({ type: 'smallint', default: 0 })
  col: number;

  @Column({ type: 'smallint', default: 0 })
  row: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 1.2 `UserSkillProgress` entity

**File**: `backend/src/modules/skill-tree/user-skill-progress.entity.ts`

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique, Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { SkillNode } from './skill-node.entity';

@Entity('user_skill_progress')
@Unique(['userId', 'skillNodeId'])
@Index(['userId', 'skillNodeId'])
export class UserSkillProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'skill_node_id' })
  skillNodeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => SkillNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_node_id' })
  skillNode: SkillNode;

  /** XP accumulated for this node's topic from correct answers. */
  @Column({ name: 'topic_xp', default: 0 })
  topicXp: number;

  @Column({ default: false })
  unlocked: boolean;

  @Column({ name: 'unlocked_at', type: 'timestamptz', nullable: true, default: null })
  unlockedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## Phase 2 – Backend Module

### 2.1 `SkillTreeService`

**File**: `backend/src/modules/skill-tree/skill-tree.service.ts`

The service has two responsibilities:
1. Querying the tree for display
2. Awarding topic XP after a correct answer (called from `QuestsService`)

```typescript
// Imports: Injectable, InjectRepository, Repository, DataSource from NestJS/TypeORM
// Entities: SkillNode, UserSkillProgress

@Injectable()
export class SkillTreeService {
  constructor(
    @InjectRepository(SkillNode)
    private readonly nodeRepo: Repository<SkillNode>,
    @InjectRepository(UserSkillProgress)
    private readonly progressRepo: Repository<UserSkillProgress>,
  ) {}

  /**
   * Returns the full tree definition for a subject with the user's
   * progress merged into each node. Returns nodes with:
   *   - all SkillNode fields
   *   - topicXp: number   (from UserSkillProgress, 0 if no record)
   *   - unlocked: boolean
   *   - progressPercent: number (0-100)
   *   - prerequisitesMet: boolean
   */
  async getTreeForUser(subjectId: string, userId: string): Promise<SkillNodeWithProgress[]> {
    const nodes = await this.nodeRepo.find({
      where: { subjectId, isActive: true },
      order: { row: 'ASC', col: 'ASC' },
    });

    const progressRecords = await this.progressRepo.find({
      where: { userId },
    });

    const progressMap = new Map(progressRecords.map((p) => [p.skillNodeId, p]));
    const unlockedIds = new Set(
      progressRecords.filter((p) => p.unlocked).map((p) => p.skillNodeId),
    );

    return nodes.map((node) => {
      const progress = progressMap.get(node.id);
      const topicXp = progress?.topicXp ?? 0;
      const prerequisitesMet = node.prerequisiteIds.every((pid) => unlockedIds.has(pid));
      return {
        ...node,
        topicXp,
        unlocked: progress?.unlocked ?? false,
        progressPercent: Math.min(100, Math.floor((topicXp / node.xpThreshold) * 100)),
        prerequisitesMet,
      };
    });
  }

  /**
   * Called by QuestsService after a correct answer.
   * Finds all SkillNodes for this subject whose topic matches (case-insensitive).
   * Awards XP to UserSkillProgress for each matching node.
   * Checks if any newly-awarded XP crosses the xpThreshold with prerequisites met.
   * Returns array of newly unlocked SkillNode IDs.
   */
  async awardTopicXp(
    userId: string,
    subjectId: string,
    topic: string,
    xpAmount: number,
  ): Promise<string[]> {
    if (!topic || xpAmount <= 0) return [];

    // Find all active nodes for this subject/topic (case-insensitive)
    const matchingNodes = await this.nodeRepo
      .createQueryBuilder('n')
      .where('n.subject_id = :subjectId', { subjectId })
      .andWhere('LOWER(n.topic) = LOWER(:topic)', { topic })
      .andWhere('n.is_active = true')
      .getMany();

    if (matchingNodes.length === 0) return [];

    const newlyUnlockedIds: string[] = [];

    for (const node of matchingNodes) {
      // Upsert progress record
      let progress = await this.progressRepo.findOne({
        where: { userId, skillNodeId: node.id },
      });

      if (!progress) {
        progress = this.progressRepo.create({
          userId,
          skillNodeId: node.id,
          topicXp: 0,
          unlocked: false,
        });
      }

      if (progress.unlocked) continue; // Already unlocked, nothing to do

      progress.topicXp += xpAmount;

      // Check if threshold reached and prerequisites are met
      if (progress.topicXp >= node.xpThreshold) {
        const unlockedPrereqs = await this.progressRepo.find({
          where: { userId },
          select: ['skillNodeId', 'unlocked'],
        });
        const unlockedIds = new Set(
          unlockedPrereqs.filter((p) => p.unlocked).map((p) => p.skillNodeId),
        );
        const prerequisitesMet = node.prerequisiteIds.every((pid) => unlockedIds.has(pid));

        if (prerequisitesMet) {
          progress.unlocked = true;
          progress.unlockedAt = new Date();
          newlyUnlockedIds.push(node.id);
        }
      }

      await this.progressRepo.save(progress);
    }

    return newlyUnlockedIds;
  }

  /**
   * Returns just the tree structure (no user progress) for a subject.
   * Used by admin/seed tooling.
   */
  async getTree(subjectId: string): Promise<SkillNode[]> {
    return this.nodeRepo.find({
      where: { subjectId, isActive: true },
      order: { row: 'ASC', col: 'ASC' },
    });
  }

  /** Admin: create or bulk-create nodes. */
  async createNode(dto: CreateSkillNodeDto): Promise<SkillNode> {
    return this.nodeRepo.save(this.nodeRepo.create(dto));
  }
}
```

### 2.2 `SkillTreeController`

**File**: `backend/src/modules/skill-tree/skill-tree.controller.ts`

All routes are protected by `JwtAuthGuard`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/subjects/:subjectId/skill-tree` | Returns tree + user progress merged (`getTreeForUser`) |
| `GET` | `/subjects/:subjectId/skill-tree/nodes` | Returns raw node list (no user data, for admin/seed) |
| `POST` | `/subjects/:subjectId/skill-tree/nodes` | Create a new skill node (admin only – add role guard later) |

```typescript
@ApiTags('skill-tree')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subjects/:subjectId/skill-tree')
export class SkillTreeController {
  constructor(private readonly skillTreeService: SkillTreeService) {}

  @Get()
  getTreeForUser(
    @Param('subjectId') subjectId: string,
    @Request() req: any,
  ) {
    return this.skillTreeService.getTreeForUser(subjectId, req.user.userId);
  }

  @Get('nodes')
  getTree(@Param('subjectId') subjectId: string) {
    return this.skillTreeService.getTree(subjectId);
  }

  @Post('nodes')
  createNode(
    @Param('subjectId') subjectId: string,
    @Body() dto: CreateSkillNodeDto,
  ) {
    return this.skillTreeService.createNode({ ...dto, subjectId });
  }
}
```

### 2.3 `SkillTreeModule`

**File**: `backend/src/modules/skill-tree/skill-tree.module.ts`

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([SkillNode, UserSkillProgress]),
  ],
  controllers: [SkillTreeController],
  providers: [SkillTreeService],
  exports: [SkillTreeService],   // exported so QuestsModule can inject it
})
export class SkillTreeModule {}
```

Register `SkillTreeModule` in `app.module.ts` imports array alongside the other modules.

---

## Phase 3 – DTOs

**File**: `backend/src/common/dto/index.ts` (append to existing file)

```typescript
// ─── Skill Tree ───────────────────────────────────────────────────────────────

export class CreateSkillNodeDto {
  @ApiProperty({ example: 'uuid-of-subject' })
  @IsOptional()  // set by controller from route param, not request body
  @IsUUID()
  subjectId?: string;

  @ApiProperty({ example: 'Derivadas' })
  @IsString()
  @MaxLength(200)
  topic: string;

  @ApiProperty({ example: 'Cálculo Diferencial' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Reglas de derivación y aplicaciones' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'sigma' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  iconKey?: string;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(1)
  xpThreshold: number;

  @ApiPropertyOptional({ type: [String], example: [] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  prerequisiteIds?: string[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  col?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  row?: number;
}

export interface SkillNodeWithProgress {
  id: string;
  subjectId: string;
  topic: string;
  name: string;
  description: string | null;
  iconKey: string;
  xpThreshold: number;
  prerequisiteIds: string[];
  col: number;
  row: number;
  topicXp: number;
  unlocked: boolean;
  progressPercent: number;
  prerequisitesMet: boolean;
}
```

---

## Phase 4 – Hook QuestsService into SkillTreeService

**File**: `backend/src/modules/quests/quests.service.ts`

### 4.1 Update `QuestsModule` to import `SkillTreeModule`

In `quests.module.ts`, add `SkillTreeModule` to the `imports` array:

```typescript
// quests.module.ts – add to imports:
import { SkillTreeModule } from '../skill-tree/skill-tree.module';

// inside @Module:
imports: [
  TypeOrmModule.forFeature([Quest, QuizQuestion, QuizOption, PlayerResult]),
  AiModule,
  PartiesModule,
  UsersModule,
  SkillTreeModule,   // <-- add this
],
```

### 4.2 Inject `SkillTreeService` into `QuestsService`

Add to `QuestsService` constructor:
```typescript
private readonly skillTreeService: SkillTreeService,
```

### 4.3 Modify `submitAnswer` to award topic XP

The current `submitAnswer` returns `{ isCorrect, correctIndex, explanation, xpEarned }`.
After computing `xpEarned`, add the following block before the `return` statement:

```typescript
// Award topic XP if the answer was correct and the question has a topic
let newlyUnlockedNodeIds: string[] = [];
if (isCorrect && xpEarned > 0) {
  // Fetch the full question to get topic and questId→subjectId
  const fullQuestion = await this.questionRepo.findOne({
    where: { id: question.id },
    select: ['topic', 'questId'],
  });
  const quest = await this.questRepo.findOne({
    where: { id: dto.questId },
    select: ['subjectId'],
  });
  if (fullQuestion?.topic && quest?.subjectId) {
    newlyUnlockedNodeIds = await this.skillTreeService.awardTopicXp(
      userId,
      quest.subjectId,
      fullQuestion.topic,
      xpEarned,
    );
  }
}

return {
  isCorrect,
  correctIndex: question.correctIndex,
  explanation: question.explanation,
  xpEarned,
  newlyUnlockedNodeIds,  // added field — empty array when nothing unlocked
};
```

> **Note on N+1**: The question lookup in `submitAnswer` currently uses `position` as the selector. The `topic` field is **not** included in that query (`select: ['id', 'correctIndex', 'explanation']`). A second fetch is needed. Alternatively, add `'topic'` to the initial select to avoid the extra query — this is the preferred approach.

Preferred single-query version — change the initial question lookup to:

```typescript
const question = await this.questionRepo.findOne({
  where: { questId: dto.questId, position: dto.questionIndex },
  select: ['id', 'correctIndex', 'explanation', 'topic'],  // add 'topic'
});
```

Then the full question re-fetch above is unnecessary. `question.topic` is already available.

---

## Phase 5 – Seed Data

**File**: `backend/src/database/seeds/skill-tree.seed.ts`

Create a standalone seed script (following the pattern of the existing `seed.ts`) that:
1. Takes a `subjectId` argument (or seeds all active subjects)
2. Calls the AI service OR uses a hardcoded JSON template to generate nodes
3. Saves them via `SkillNodeRepository`

Example hardcoded template structure for a "Cálculo I" subject:

```typescript
const CALCULO_I_NODES = [
  // Row 0 – root
  { topic: 'Límites', name: 'Límites', iconKey: 'arrow-right', xpThreshold: 100, prerequisiteIds: [], col: 2, row: 0 },
  // Row 1
  { topic: 'Continuidad', name: 'Continuidad', iconKey: 'link', xpThreshold: 120, prerequisiteIds: ['<límites-id>'], col: 1, row: 1 },
  { topic: 'Derivadas', name: 'Derivadas', iconKey: 'trending-up', xpThreshold: 150, prerequisiteIds: ['<límites-id>'], col: 3, row: 1 },
  // Row 2
  { topic: 'Integrales', name: 'Integrales', iconKey: 'sigma', xpThreshold: 200, prerequisiteIds: ['<derivadas-id>'], col: 3, row: 2 },
  { topic: 'Teorema del Valor Medio', name: 'T. Valor Medio', iconKey: 'bar-chart', xpThreshold: 180, prerequisiteIds: ['<derivadas-id>', '<continuidad-id>'], col: 1, row: 2 },
];
```

Since IDs are UUIDs generated at insert time, the seed script should insert root nodes first and capture their IDs before inserting dependent nodes.

---

## Phase 6 – Frontend Service

**File**: `frontend/src/services/skillTreeService.ts`

```typescript
import { api } from './api';

export interface SkillNode {
  id: string;
  subjectId: string;
  topic: string;
  name: string;
  description: string | null;
  iconKey: string;
  xpThreshold: number;
  prerequisiteIds: string[];
  col: number;
  row: number;
  // merged user progress fields
  topicXp: number;
  unlocked: boolean;
  progressPercent: number;
  prerequisitesMet: boolean;
}

export const skillTreeService = {
  getTree: async (subjectId: string): Promise<SkillNode[]> => {
    const { data } = await api.get<SkillNode[]>(`/subjects/${subjectId}/skill-tree`);
    return data;
  },
};
```

---

## Phase 7 – Frontend Hook

**File**: `frontend/src/hooks/useSkillTree.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { skillTreeService, type SkillNode } from '../services/skillTreeService';

export function useSkillTree(subjectId: string) {
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!subjectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await skillTreeService.getTree(subjectId);
      setNodes(data);
    } catch {
      setError('No se pudo cargar el árbol de habilidades');
    } finally {
      setIsLoading(false);
    }
  }, [subjectId]);

  useEffect(() => { load(); }, [load]);

  return { nodes, isLoading, error, reload: load };
}
```

---

## Phase 8 – Frontend Page: `SkillTreePage`

**File**: `frontend/src/pages/SkillTreePage.tsx`

### Layout
Use `MobileLayout` from `Layouts.tsx` (same as DashboardPage). Add a back button using `useNavigate(-1)`.

### Rendering the tree
The tree is rendered as a CSS Grid or SVG canvas. Recommended approach: **CSS Grid** for simplicity.

- Derive `maxCol` and `maxRow` from nodes. Grid has `(maxCol + 1)` columns and `(maxRow + 1)` rows.
- Each node is absolutely positioned at `grid-column: col + 1 / span 1; grid-row: row + 1 / span 1`.
- Draw prerequisite edges as SVG `<line>` elements layered underneath the grid using `position: absolute` and `pointer-events: none`.

### SkillNode visual states

| State | CSS class | Appearance |
|-------|-----------|------------|
| Locked + prerequisites not met | `skill-node--locked` | Greyed out, blurred icon, no progress bar |
| Locked + prerequisites met | `skill-node--available` | Normal icon, colored border, progress bar showing `progressPercent%` |
| Unlocked | `skill-node--unlocked` | Gold border, glowing shadow, checkmark badge overlay |

### Node click popover
Clicking any node opens an inline popover (no routing) showing:
- Node name and description
- Topic name
- XP progress: `{topicXp} / {xpThreshold} XP`
- Progress bar
- If unlocked: "✓ Desbloqueado" badge
- If locked + prerequisites not met: lists the names of prerequisite nodes still locked

### Component structure

```
SkillTreePage
  └── MobileLayout
        ├── BackButton (uses useNavigate)
        ├── SubjectHeader (subject name, passed via location.state or fetched)
        ├── SkillTreeCanvas
        │     ├── svg (edge lines, rendered below nodes)
        │     └── SkillNodeCard × N (grid-positioned)
        └── SkillNodePopover (conditionally rendered, receives selected node)
```

### Route

Add to `App.tsx` router:

```tsx
<Route path="/subjects/:subjectId/skill-tree" element={<SkillTreePage />} />
```

---

## Phase 9 – Post-Quiz Unlock Toast / Overlay

**File**: `frontend/src/pages/QuizPage.tsx` (modify existing) and new component in `frontend/src/components/SkillTreeComponents.tsx`

### Trigger
The `questService.submitAnswer` response now includes `newlyUnlockedNodeIds: string[]`. When this array is non-empty, fetch the node names from local state (or a small API call) and display a toast.

### Implementation

In `useQuiz.ts`, change the `answer` callback to capture `newlyUnlockedNodeIds` from the API response and return them to the caller.

Change the return value of `useQuiz`:
```typescript
// add to returned object:
newlyUnlocked: string[]   // node names unlocked this answer
```

In `QuizPage.tsx`, after each answer:
```tsx
if (newlyUnlocked.length > 0) {
  // Show SkillUnlockToast for 3 seconds
}
```

### `SkillUnlockToast` component

**File**: `frontend/src/components/SkillTreeComponents.tsx`

```tsx
// Small slide-in toast at top of screen listing unlocked nodes
// Props: nodeNames: string[], onDismiss: () => void
// Auto-dismisses after 3 seconds
// Uses existing CSS animation patterns (slide-in, fade-out)
// Spanish copy: "🌟 Habilidad desbloqueada: {name}"
```

---

## Phase 10 – Dashboard Integration

**File**: `frontend/src/components/DashboardComponents.tsx`

In `SubjectCardGrid`, add a small "🌳 Ver habilidades" link/button below each subject card. On click, navigate to `/subjects/:subjectId/skill-tree`.

This requires passing the `subjectId` (already on each subject object) to the navigation call.

---

## Phase 11 – CSS

**File**: `frontend/src/App.css` (or a new `frontend/src/styles/skill-tree.css` imported in `App.css`)

Add CSS classes:

```css
/* ── Skill Tree Canvas ────────────────────────────────────────── */
.skill-tree-canvas { position: relative; }
.skill-tree-grid { display: grid; gap: 1rem; position: relative; z-index: 1; }
.skill-tree-edges { position: absolute; inset: 0; z-index: 0; pointer-events: none; }

/* ── Skill Node Card ──────────────────────────────────────────── */
.skill-node { border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
.skill-node:hover { transform: scale(1.05); }
.skill-node__icon { font-size: 2rem; }
.skill-node__name { font-size: 0.75rem; font-weight: 600; text-align: center; }
.skill-node__xp { font-size: 0.65rem; color: var(--color-text-muted); }

/* ── States ───────────────────────────────────────────────────── */
.skill-node--locked { background: var(--color-surface-2); border: 2px solid var(--color-border); opacity: 0.5; cursor: not-allowed; }
.skill-node--available { background: var(--color-surface-2); border: 2px solid var(--color-primary); }
.skill-node--unlocked { background: linear-gradient(135deg, var(--color-primary-dim), var(--color-surface-2)); border: 2px solid var(--color-gold, #f5c518); box-shadow: 0 0 12px rgba(245, 197, 24, 0.4); }

/* ── Progress Bar ─────────────────────────────────────────────── */
.skill-node__progress { width: 100%; height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
.skill-node__progress-fill { height: 100%; background: var(--color-primary); border-radius: 2px; transition: width 0.4s ease; }

/* ── Unlock toast ─────────────────────────────────────────────── */
.skill-unlock-toast { position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); background: var(--color-gold, #f5c518); color: #000; border-radius: 20px; padding: 0.5rem 1.25rem; font-weight: 700; z-index: 9999; animation: slideInDown 0.3s ease; }
@keyframes slideInDown { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

/* ── Popover ──────────────────────────────────────────────────── */
.skill-node-popover { position: fixed; bottom: 1rem; left: 1rem; right: 1rem; background: var(--color-surface-1); border: 1px solid var(--color-border); border-radius: 16px; padding: 1.25rem; z-index: 200; animation: slideInUp 0.25s ease; }
@keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
```

---

## Implementation Order for Agents

Execute phases in this order to avoid circular dependency issues:

1. **Phase 1** — Create entities (no dependencies)
2. **Phase 3** — Add DTOs to `common/dto/index.ts`
3. **Phase 2** — Create service, controller, module; register in `app.module.ts`
4. **Phase 4** — Modify `quests.module.ts` and `quests.service.ts`
5. **Phase 5** — Create seed script
6. **Phase 6** — Frontend service
7. **Phase 7** — Frontend hook
8. **Phase 11** — CSS classes
9. **Phase 8** — `SkillTreePage` component + route
10. **Phase 9** — `SkillUnlockToast` + `QuizPage` modifications
11. **Phase 10** — Dashboard integration

---

## Key Invariants to Preserve

- `QuestsService.submitAnswer` must still return `isCorrect`, `correctIndex`, `explanation`, `xpEarned` — the `newlyUnlockedNodeIds` field is **additive**.
- Global XP (`User.stats.xp`) is updated by `UsersService.addXp()` and must not be changed.
- `QuizQuestion.topic` is set by the AI service during generation and should not be modified.
- All new endpoints must be protected by `JwtAuthGuard`.
- No existing entity schemas (User, Subject, Party, Quest, etc.) are modified.

---

## Open Questions / Future Work

- **AI-generated trees**: `SkillTreeService` could call `AiService` to auto-generate node definitions from a subject's description. Seed data is the MVP path.
- **Role guard for node creation**: Currently `POST /subjects/:id/skill-tree/nodes` has no admin check. Add a `RolesGuard` when role management is implemented.
- **Party-wide progress view**: Show aggregate skill unlocks across party members (e.g. "3/4 members unlocked Derivadas").
- **Streak bonus**: Award bonus topic XP when `User.stats.currentStreak > 3`.
- **Mobile scroll**: The grid canvas may need horizontal scroll on small screens if `maxCol > 3`.
