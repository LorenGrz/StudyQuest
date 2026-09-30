import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeSubjectName } from '../../common/subject-name';
import {
  cleanSubjectName,
  SubjectNameLayer,
  validateSubjectName,
} from '../../common/subject-name.validator';
import {
  CommunitySubjectRow,
  CommunitySubjectsStore,
  DuplicateSubjectError,
  StoreUser,
} from './community-subjects.store';
import { SubjectNameClassifier } from './subject-name-classifier.service';
import type { SubjectReportReason } from './subject-report-reasons';

/** Defaults of the trust rules (plan R2); overridable per environment. */
export const COMMUNITY_DEFAULTS = {
  /** Distinct users of the university needed to make a subject public. */
  promoteUsers: 3,
  /** Distinct reports that auto-hide a non-official subject. */
  hideReports: 3,
  /** New community subjects per user per rolling 24 h. */
  perDay: 10,
  /** pg_trgm similarity that triggers "¿Quisiste decir…?". */
  similar: 0.6,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** What the API returns for a subject (never `moderation`). */
export interface CommunitySubjectDto {
  id: string;
  name: string;
  code: string | null;
  /** null for community subjects (no plan year). */
  year: number | null;
  universityId: string | null;
  careerId: string | null;
  /** Badge: official → "Oficial"; community/legacy → none. */
  source: CommunitySubjectRow['source'];
  /** Badge: private → "Privada" (only its creator/enrolled users see it). */
  visibility: CommunitySubjectRow['visibility'];
  status: CommunitySubjectRow['status'];
  enrolledCount: number;
  /** The viewer is enrolled in it. */
  enrolled: boolean;
  /** The viewer created it. */
  createdByMe: boolean;
}

export type CreateCommunityOutcome =
  | 'created'
  | 'revived'
  | 'enrolled_existing'
  | 'already_enrolled';

export interface CreateCommunityResult {
  outcome: CreateCommunityOutcome;
  subject: CommunitySubjectDto;
}

export interface CreateCommunityInput {
  name: string;
  careerId?: string;
  /** Skip the "¿Quisiste decir…?" prompts (similar subject, spelling). Never skips validation. */
  force?: boolean;
}

export const toCommunitySubjectDto = (
  row: CommunitySubjectRow,
  viewerId: string,
): CommunitySubjectDto => ({
  id: row.id,
  name: row.name,
  code: row.code,
  year: row.year > 0 ? row.year : null,
  universityId: row.universityId,
  careerId: row.careerId,
  source: row.source,
  visibility: row.visibility,
  status: row.status,
  enrolledCount: Number(row.enrolledCount),
  enrolled: Boolean(row.enrolledByViewer),
  createdByMe: row.createdBy === viewerId,
});

const isUsable = (r: CommunitySubjectRow) =>
  r.status === 'active' && r.isActive;
const isVisibleTo = (r: CommunitySubjectRow, userId: string) =>
  r.visibility === 'university' || r.createdBy === userId || r.enrolledByViewer;
/** Hidden by the R1 backfill (unreferenced legacy), never reviewed. */
const isRevivableLegacy = (r: CommunitySubjectRow) =>
  r.status === 'hidden' && r.source === 'legacy' && !r.reviewed;

/**
 * Community subjects (plan R2): suggest, create with dedup + 3-layer
 * validation, report, and enrollment with the trust rules (private until 3
 * users of the university join, hidden at 3 reports).
 */
@Injectable()
export class CommunitySubjectsService {
  private readonly logger = new Logger(CommunitySubjectsService.name);

  constructor(
    private readonly store: CommunitySubjectsStore,
    private readonly classifier: SubjectNameClassifier,
    private readonly cfg: ConfigService,
  ) {}

  private setting(key: string, fallback: number): number {
    const n = Number(this.cfg.get(key));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  private get promoteUsers() {
    return this.setting(
      'COMMUNITY_SUBJECT_PROMOTE_USERS',
      COMMUNITY_DEFAULTS.promoteUsers,
    );
  }
  private get hideReports() {
    return this.setting(
      'COMMUNITY_SUBJECT_HIDE_REPORTS',
      COMMUNITY_DEFAULTS.hideReports,
    );
  }
  private get perDay() {
    return this.setting(
      'COMMUNITY_SUBJECTS_PER_DAY',
      COMMUNITY_DEFAULTS.perDay,
    );
  }

  /** The caller's university; legacy free-text users get a clear 400. */
  private async requireUniversity(
    userId: string,
  ): Promise<StoreUser & { universityId: string; universityName: string }> {
    const user = await this.store.getUser(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.universityId || !user.universityName)
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        code: 'UNIVERSITY_REQUIRED',
        message:
          'Para buscar y crear materias primero elegí tu universidad en tu perfil.',
      });
    return user as StoreUser & { universityId: string; universityName: string };
  }

  // ── GET /subjects/suggest ────────────────────────────────────────────────

  async suggest(
    userId: string,
    q: string,
    limit = 10,
  ): Promise<CommunitySubjectDto[]> {
    const user = await this.requireUniversity(userId);
    const key = normalizeSubjectName(q ?? '');
    if (!key) return [];
    const rows = await this.store.suggest(
      user.universityId,
      key,
      userId,
      limit,
    );
    return rows.map((r) => toCommunitySubjectDto(r, userId));
  }

  // ── POST /subjects/community ─────────────────────────────────────────────

  async create(
    userId: string,
    input: CreateCommunityInput,
  ): Promise<CreateCommunityResult> {
    const user = await this.requireUniversity(userId);
    const name = cleanSubjectName(input.name ?? '');
    const key = normalizeSubjectName(name);
    if (!key)
      this.rejectName(userId, name, {
        layer: 'format',
        reason: 'empty',
        message:
          'Escribí el nombre de la materia, por ejemplo «Análisis Matemático II».',
      });

    const career = await this.resolveCareerTag(user, input.careerId);

    // 1–2. Same (university, normalized name) → reuse it.
    const matches = await this.store.findByKey(user.universityId, key, userId);
    const existing = this.pickExisting(matches, userId);
    if (existing) return this.joinExisting(userId, existing);
    const revivable = matches.find(isRevivableLegacy) ?? null;
    if (!revivable && matches.length)
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        code: 'SUBJECT_UNDER_REVIEW',
        message:
          'Esa materia está en revisión y por ahora no se puede usar. Probá más tarde o escribí otro nombre.',
      });

    // 3. Very similar ones → "¿Quisiste decir…?" unless forced.
    if (!input.force) {
      const similar = await this.store.findSimilar(
        user.universityId,
        key,
        userId,
        COMMUNITY_DEFAULTS.similar,
        5,
      );
      if (similar.length)
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          code: 'SIMILAR_SUBJECTS',
          message:
            '¿Quisiste decir alguna de estas? Si tu materia es otra, podés crearla igual.',
          suggestions: similar.map((r) => toCommunitySubjectDto(r, userId)),
        });
    }

    // Daily limit before spending a model call (re-checked under a lock).
    await this.assertDailyLimit(userId);

    // 4. Validation: format → profanity → AI (fail-closed).
    const local = validateSubjectName(name);
    if (!local.ok) this.rejectName(userId, name, local);

    const ai = await this.classifier.classify({
      name,
      university: user.universityName,
      career: career?.name ?? user.careerName,
    });
    if (ai.status !== 'ok')
      this.rejectName(userId, name, {
        layer: 'ai_unavailable',
        reason: ai.error,
        message:
          'No pudimos validar el nombre en este momento. Probá de nuevo en un rato o con otro nombre.',
      });
    if (!ai.verdict.valid)
      this.rejectName(userId, name, {
        layer: 'ai',
        reason: ai.verdict.category,
        message:
          'Ese nombre no parece una materia real. Escribí el nombre como figura en tu plan de estudios, por ejemplo «Análisis Matemático II».',
      });

    // Spelling/capitalization fix: offered, never applied.
    const suggestedName = this.acceptableSuggestion(
      name,
      ai.verdict.suggestedName,
    );
    if (suggestedName && !input.force)
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        code: 'NAME_SUGGESTION',
        message: `¿Quisiste escribir «${suggestedName}»? Elegí cómo querés guardarla.`,
        suggestedName,
      });

    const moderation: Record<string, unknown> = {
      version: 1,
      acceptedAt: new Date().toISOString(),
      userId,
      input: name,
      forced: Boolean(input.force),
      layers: {
        format: 'ok',
        profanity: 'ok',
        ai: {
          provider: ai.provider,
          model: ai.model,
          category: ai.verdict.category,
          reason: ai.verdict.reason,
          suggestedName: ai.verdict.suggestedName,
          latencyMs: ai.latencyMs,
        },
      },
      ...(revivable
        ? {
            revivedFrom: {
              id: revivable.id,
              source: 'legacy',
              status: 'hidden',
            },
          }
        : {}),
    };

    // 5. Create (or revive) private + enroll me, under a per-user lock.
    let subjectId: string;
    let outcome: CreateCommunityOutcome;
    try {
      ({ subjectId, outcome } = await this.store.transaction(async (tx) => {
        await tx.lockUser(userId);
        await this.assertDailyLimit(userId, tx);
        let id: string;
        let result: CreateCommunityOutcome;
        if (
          revivable &&
          (await tx.reviveHiddenLegacy(revivable.id, {
            createdBy: userId,
            careerId: career?.id ?? null,
            moderation,
          }))
        ) {
          id = revivable.id;
          result = 'revived';
        } else {
          id = await tx.insert({
            name,
            nameNormalized: key,
            universityId: user.universityId,
            universityName: user.universityName,
            careerId: career?.id ?? null,
            careerName: career?.name ?? null,
            createdBy: userId,
            moderation,
          });
          result = 'created';
        }
        await tx.enroll(userId, id);
        await tx.promoteIfTrusted(id, this.promoteUsers);
        return { subjectId: id, outcome: result };
      }));
    } catch (err) {
      if (!(err instanceof DuplicateSubjectError)) throw err;
      // Someone created the same key meanwhile (or the revive lost a race):
      // join theirs.
      const again = await this.store.findByKey(user.universityId, key, userId);
      const winner = this.pickExisting(again, userId);
      if (!winner) throw err;
      return this.joinExisting(userId, winner);
    }

    this.logger.log(
      `Materia comunitaria ${outcome}: ${subjectId} "${name}" (user ${userId})`,
    );
    return { outcome, subject: await this.dto(subjectId, userId) };
  }

  // ── POST /users/me/subjects ──────────────────────────────────────────────

  /**
   * Enroll by id. Merged subjects are followed to the subject they were
   * merged into (up to 5 hops) so old links keep working; hidden subjects and
   * other users' private subjects are rejected (the latter as 404, so their
   * existence doesn't leak). Joining someone's private subject is only
   * possible by typing the same name (POST /subjects/community).
   */
  async enroll(
    userId: string,
    subjectId: string,
  ): Promise<{ subjectId: string; enrolled: boolean; promoted: boolean }> {
    let row = await this.store.findById(subjectId, userId);
    for (let hop = 0; row?.status === 'merged' && hop < 5; hop++)
      row = row.mergedIntoId
        ? await this.store.findById(row.mergedIntoId, userId)
        : null;
    if (!row || row.status === 'merged')
      throw new NotFoundException('Materia no encontrada');
    if (row.enrolledByViewer)
      return { subjectId: row.id, enrolled: false, promoted: false };
    if (!isVisibleTo(row, userId))
      throw new NotFoundException('Materia no encontrada');
    if (!isUsable(row))
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        code: 'SUBJECT_HIDDEN',
        message:
          'Esta materia está en revisión y por ahora no admite inscripciones.',
      });
    const target = row;
    return this.store.transaction(async (tx) => {
      const enrolled = await tx.enroll(userId, target.id);
      const promoted = enrolled
        ? await tx.promoteIfTrusted(target.id, this.promoteUsers)
        : false;
      return { subjectId: target.id, enrolled, promoted };
    });
  }

  // ── GET /subjects/:id, GET /users/leaderboard/:subjectId ────────────────

  /**
   * Id of the subject `viewer` may read by `subjectId`, or 404:
   *  - merged → its target (followed up to 5 hops, then checked the same
   *    way), so old links resolve to the surviving subject;
   *  - hidden → admins only;
   *  - private → admins, its creator and enrolled users;
   *  - public → anyone, anonymous included.
   * 404 (not 403) so private/hidden subjects don't reveal they exist.
   */
  async resolveReadable(
    subjectId: string,
    viewer?: { userId: string; role?: string } | null,
  ): Promise<string> {
    const viewerId = viewer?.userId ?? null;
    const isAdmin = viewer?.role === 'ADMIN';
    let row = await this.store.findById(subjectId, viewerId);
    for (let hop = 0; row?.status === 'merged' && hop < 5; hop++)
      row = row.mergedIntoId
        ? await this.store.findById(row.mergedIntoId, viewerId)
        : null;
    if (!row || row.status === 'merged')
      throw new NotFoundException('Materia no encontrada');
    const isOwner =
      viewerId !== null &&
      (row.createdBy === viewerId || row.enrolledByViewer);
    const readable =
      isAdmin ||
      (row.status !== 'hidden' &&
        (row.visibility === 'university' || isOwner));
    if (!readable) throw new NotFoundException('Materia no encontrada');
    return row.id;
  }

  // ── POST /subjects/:id/report ────────────────────────────────────────────

  async report(
    userId: string,
    subjectId: string,
    input: { reason?: SubjectReportReason; details?: string },
  ): Promise<{ reported: true; alreadyReported: boolean; hidden: boolean }> {
    const row = await this.store.findById(subjectId, userId);
    if (!row || row.status === 'merged' || !isVisibleTo(row, userId))
      throw new NotFoundException('Materia no encontrada');
    const inserted = await this.store.addReport(
      row.id,
      userId,
      input.reason ?? 'other',
      input.details?.trim() || null,
    );
    const hiddenNow = inserted
      ? await this.store.hideIfReported(row.id, this.hideReports)
      : false;
    if (hiddenNow)
      this.logger.warn(
        `Materia ${row.id} "${row.name}" oculta por ${this.hideReports} reportes`,
      );
    return {
      reported: true,
      alreadyReported: !inserted,
      hidden: hiddenNow || row.status === 'hidden',
    };
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async dto(id: string, userId: string): Promise<CommunitySubjectDto> {
    const row = await this.store.findById(id, userId);
    if (!row) throw new NotFoundException('Materia no encontrada');
    return toCommunitySubjectDto(row, userId);
  }

  /**
   * Usable exact match to reuse: the ones I can already see first (mine,
   * enrolled, public), then official, then most enrolled. Another user's
   * private subject counts too — that's how 3 students typing the same name
   * end up in one subject and make it public.
   */
  private pickExisting(
    rows: CommunitySubjectRow[],
    userId: string,
  ): CommunitySubjectRow | null {
    const usable = rows.filter(isUsable);
    usable.sort(
      (a, b) =>
        Number(isVisibleTo(b, userId)) - Number(isVisibleTo(a, userId)) ||
        Number(b.source === 'official') - Number(a.source === 'official') ||
        Number(b.enrolledCount) - Number(a.enrolledCount) ||
        a.id.localeCompare(b.id),
    );
    return usable[0] ?? null;
  }

  private async joinExisting(
    userId: string,
    row: CommunitySubjectRow,
  ): Promise<CreateCommunityResult> {
    const enrolled = await this.store.transaction(async (tx) => {
      const added = await tx.enroll(userId, row.id);
      if (added) await tx.promoteIfTrusted(row.id, this.promoteUsers);
      return added;
    });
    return {
      outcome: enrolled ? 'enrolled_existing' : 'already_enrolled',
      subject: await this.dto(row.id, userId),
    };
  }

  /** Optional career tag: must be active and of my university. Defaults to mine. */
  private async resolveCareerTag(
    user: StoreUser & { universityId: string },
    careerId: string | undefined,
  ): Promise<{ id: string; name: string } | null> {
    if (!careerId)
      return user.careerId && user.careerName
        ? { id: user.careerId, name: user.careerName }
        : null;
    const career = await this.store.findCareer(user.universityId, careerId);
    if (!career)
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        code: 'CAREER_INVALID',
        message: 'Esa carrera no existe o no es de tu universidad.',
      });
    return career;
  }

  private async assertDailyLimit(
    userId: string,
    store: CommunitySubjectsStore = this.store,
  ): Promise<void> {
    const limit = this.perDay;
    const created = await store.countCreatedSince(
      userId,
      new Date(Date.now() - DAY_MS),
    );
    if (created >= limit)
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        code: 'DAILY_LIMIT',
        message: `Ya creaste ${limit} materias nuevas hoy, que es el máximo por día. Mañana vas a poder crear más.`,
        limit,
      });
  }

  /**
   * The model's spelling fix, only if it is itself a clean name and really a
   * small correction of what the user typed (not a different subject).
   */
  private acceptableSuggestion(
    name: string,
    suggested: string | null,
  ): string | null {
    if (!suggested) return null;
    const clean = cleanSubjectName(suggested);
    if (clean === name) return null;
    const check = validateSubjectName(clean);
    if (!check.ok) return null;
    const a = normalizeSubjectName(name);
    const b = normalizeSubjectName(clean);
    const distance = levenshtein(a, b);
    return distance <= Math.max(2, Math.floor(a.length * 0.3)) ? clean : null;
  }

  private rejectName(
    userId: string,
    name: string,
    rejection: { layer: SubjectNameLayer; reason: string; message: string },
  ): never {
    this.logger.warn(
      `Materia rechazada (${rejection.layer}/${rejection.reason}) user ${userId}: "${name.slice(0, 100)}"`,
    );
    throw new UnprocessableEntityException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      error: 'Unprocessable Entity',
      code: 'SUBJECT_NAME_REJECTED',
      layer: rejection.layer,
      reason: rejection.reason,
      message: rejection.message,
    });
  }
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diag = tmp;
    }
  }
  return prev[b.length];
}
