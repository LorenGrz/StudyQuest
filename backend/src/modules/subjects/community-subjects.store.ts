import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import type {
  SubjectSource,
  SubjectStatus,
  SubjectVisibility,
} from './subject.entity';
import type { SubjectReportReason } from './subject-report-reasons';

/** A subject as the community flow sees it, relative to one viewer. */
export interface CommunitySubjectRow {
  id: string;
  name: string;
  code: string | null;
  year: number;
  universityId: string | null;
  careerId: string | null;
  nameNormalized: string;
  source: SubjectSource;
  visibility: SubjectVisibility;
  status: SubjectStatus;
  createdBy: string | null;
  mergedIntoId: string | null;
  enrolledCount: number;
  isActive: boolean;
  /** `moderation IS NOT NULL` (the JSON itself is never read back). */
  reviewed: boolean;
  enrolledByViewer: boolean;
}

export interface StoreUser {
  id: string;
  universityId: string | null;
  careerId: string | null;
  universityName: string | null;
  careerName: string | null;
}

export interface NewCommunitySubject {
  name: string;
  nameNormalized: string;
  universityId: string;
  universityName: string;
  careerId: string | null;
  careerName: string | null;
  createdBy: string;
  moderation: Record<string, unknown>;
}

/** Another row already holds (university_id, name_normalized). */
export class DuplicateSubjectError extends Error {}

interface Runner {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

/** Base key of a disambiguated legacy key "<normalized> ~<code>". */
const BASE_KEY = `split_part(s.name_normalized, ' ~', 1)`;

/** Columns of CommunitySubjectRow; `$viewer` is replaced by the param index. */
const columns = (viewer: string) => `
  s.id, s.name, s.code, s.year,
  s.university_id AS "universityId", s.career_id AS "careerId",
  s.name_normalized AS "nameNormalized", s.source, s.visibility, s.status,
  s.created_by AS "createdBy", s.merged_into_id AS "mergedIntoId",
  s.enrolled_count AS "enrolledCount", s.is_active AS "isActive",
  (s.moderation IS NOT NULL) AS reviewed,
  EXISTS (
    SELECT 1 FROM user_subjects us
    WHERE us.subject_id = s.id AND us.user_id = ${viewer}
  ) AS "enrolledByViewer"`;

/** Public, mine, or one I'm enrolled in. */
const visibleTo = (viewer: string) => `(
  s.visibility = 'university'
  OR s.created_by = ${viewer}
  OR EXISTS (
    SELECT 1 FROM user_subjects us
    WHERE us.subject_id = s.id AND us.user_id = ${viewer}
  )
)`;

const likeEscape = (s: string) => s.replace(/[\\%_]/g, '\\$&');

/**
 * SQL for community subjects (plan R2). Parameterized raw queries so the
 * trigram functions, the " ~code" base key and the atomic promote/hide
 * updates stay readable; CommunitySubjectsService holds the rules. Every
 * method runs on the DataSource or, inside transaction(), on its manager.
 */
@Injectable()
export class CommunitySubjectsStore {
  private runner: Runner;

  constructor(private readonly dataSource: DataSource) {
    this.runner = dataSource;
  }

  transaction<T>(fn: (tx: CommunitySubjectsStore) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((em: EntityManager) => {
      const tx = new CommunitySubjectsStore(this.dataSource);
      tx.runner = em;
      return fn(tx);
    });
  }

  private async rows<T>(sql: string, params: unknown[]): Promise<T[]> {
    const result = await this.runner.query(sql, params);
    // TypeORM's Postgres driver returns [rows, rowCount] for UPDATE/DELETE.
    if (
      Array.isArray(result) &&
      result.length === 2 &&
      Array.isArray(result[0]) &&
      typeof result[1] === 'number'
    )
      return result[0] as T[];
    return result as T[];
  }

  async getUser(userId: string): Promise<StoreUser | null> {
    const [row] = await this.rows<StoreUser>(
      `SELECT u.id, u.university_id AS "universityId", u.career_id AS "careerId",
              un.name AS "universityName", c.name AS "careerName"
       FROM users u
       LEFT JOIN universities un ON un.id = u.university_id
       LEFT JOIN careers c ON c.id = u.career_id
       WHERE u.id = $1`,
      [userId],
    );
    return row ?? null;
  }

  async findCareer(
    universityId: string,
    careerId: string,
  ): Promise<{ id: string; name: string } | null> {
    const [row] = await this.rows<{ id: string; name: string }>(
      `SELECT id, name FROM careers
       WHERE id = $1 AND university_id = $2 AND status = 'active'`,
      [careerId, universityId],
    );
    return row ?? null;
  }

  async findById(
    id: string,
    viewerId: string,
  ): Promise<CommunitySubjectRow | null> {
    const [row] = await this.rows<CommunitySubjectRow>(
      `SELECT ${columns('$2')} FROM subjects s WHERE s.id = $1`,
      [id, viewerId],
    );
    return row ?? null;
  }

  /**
   * Every non-merged row of the university whose key is `key`, including
   * legacy rows disambiguated as "<key> ~<code>" (R1 backfill), hidden rows
   * and other users' private subjects: the caller decides what to reuse.
   */
  findByKey(
    universityId: string,
    key: string,
    viewerId: string,
  ): Promise<CommunitySubjectRow[]> {
    return this.rows<CommunitySubjectRow>(
      `SELECT ${columns('$4')} FROM subjects s
       WHERE s.university_id = $1 AND s.status <> 'merged'
         AND (s.name_normalized = $2 OR s.name_normalized LIKE $3)`,
      [universityId, key, `${likeEscape(key)} ~%`, viewerId],
    );
  }

  /** "¿Quisiste decir…?": visible, active, different key, similarity ≥ min. */
  findSimilar(
    universityId: string,
    key: string,
    viewerId: string,
    minSimilarity: number,
    limit: number,
  ): Promise<CommunitySubjectRow[]> {
    return this.rows<CommunitySubjectRow>(
      `SELECT ${columns('$3')} FROM subjects s
       WHERE s.university_id = $1 AND s.status = 'active' AND s.is_active
         AND ${visibleTo('$3')}
         AND ${BASE_KEY} <> $2
         AND similarity(${BASE_KEY}, $2) >= $4
       ORDER BY similarity(${BASE_KEY}, $2) DESC,
                (s.source = 'official') DESC, s.enrolled_count DESC, s.name
       LIMIT $5`,
      [universityId, key, viewerId, minSimilarity, limit],
    );
  }

  /**
   * Autocomplete within the university: official + public community/legacy
   * + mine (created or enrolled). `q` is already normalizeSubjectName()d, so
   * "analisis 1" looks for "analisis i". word_similarity covers prefixes
   * while typing ("progra" → "programacion iii").
   */
  suggest(
    universityId: string,
    q: string,
    viewerId: string,
    limit: number,
  ): Promise<CommunitySubjectRow[]> {
    return this.rows<CommunitySubjectRow>(
      `SELECT ${columns('$3')} FROM subjects s
       WHERE s.university_id = $1 AND s.status = 'active' AND s.is_active
         AND ${visibleTo('$3')}
         AND (${BASE_KEY} LIKE $4
              OR similarity(${BASE_KEY}, $2) >= 0.3
              OR word_similarity($2, ${BASE_KEY}) >= 0.5)
       ORDER BY (${BASE_KEY} = $2) DESC,
                greatest(similarity(${BASE_KEY}, $2),
                         word_similarity($2, ${BASE_KEY})) DESC,
                (s.source = 'official') DESC, s.enrolled_count DESC, s.name
       LIMIT $5`,
      [universityId, q, viewerId, `%${likeEscape(q)}%`, limit],
    );
  }

  /** Community subjects this user got accepted since `since` (daily limit). */
  async countCreatedSince(userId: string, since: Date): Promise<number> {
    const [row] = await this.rows<{ n: number }>(
      `SELECT count(*)::int AS n FROM subjects
       WHERE created_by = $1 AND source = 'community'
         AND moderation ? 'acceptedAt'
         AND (moderation->>'acceptedAt')::timestamptz >= $2`,
      [userId, since.toISOString()],
    );
    return row?.n ?? 0;
  }

  /** Serializes one user's creations inside a transaction (daily limit). */
  async lockUser(userId: string): Promise<void> {
    await this.runner.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `community-subject:${userId}`,
    ]);
  }

  /** New private community subject; DuplicateSubjectError on the key race. */
  async insert(data: NewCommunitySubject): Promise<string> {
    try {
      const [row] = await this.rows<{ id: string }>(
        `INSERT INTO subjects
           (name, code, description, university, career, year, enrolled_count,
            is_active, university_id, career_id, name_normalized, source,
            created_by, visibility, status, moderation)
         VALUES ($1, NULL, NULL, $2, $3, 0, 0, true, $4, $5, $6, 'community',
                 $7, 'private', 'active', $8::jsonb)
         RETURNING id`,
        [
          data.name,
          data.universityName,
          data.careerName ?? '',
          data.universityId,
          data.careerId,
          data.nameNormalized,
          data.createdBy,
          JSON.stringify(data.moderation),
        ],
      );
      return row.id;
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string } | undefined)?.code === '23505'
      )
        throw new DuplicateSubjectError();
      throw err;
    }
  }

  /**
   * A legacy row the R1 backfill hid (unreferenced, never reviewed) holds the
   * key: bring it back as this user's private community subject. Writing
   * `moderation` marks it reviewed, so a backfill re-run never hides it
   * again. False if it is no longer in that state (race).
   */
  async reviveHiddenLegacy(
    id: string,
    data: Pick<NewCommunitySubject, 'createdBy' | 'careerId' | 'moderation'>,
  ): Promise<boolean> {
    const rows = await this.rows<{ id: string }>(
      `UPDATE subjects
       SET status = 'active', visibility = 'private', source = 'community',
           created_by = $2, career_id = COALESCE(career_id, $3),
           moderation = $4::jsonb, updated_at = now()
       WHERE id = $1 AND status = 'hidden' AND source = 'legacy'
         AND moderation IS NULL
       RETURNING id`,
      [id, data.createdBy, data.careerId, JSON.stringify(data.moderation)],
    );
    return rows.length > 0;
  }

  /** Idempotent; true when the enrollment is new (enrolled_count +1). */
  async enroll(userId: string, subjectId: string): Promise<boolean> {
    const inserted = await this.rows<{ subject_id: string }>(
      `INSERT INTO user_subjects (user_id, subject_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING subject_id`,
      [userId, subjectId],
    );
    if (!inserted.length) return false;
    await this.runner.query(
      `UPDATE subjects SET enrolled_count = enrolled_count + 1 WHERE id = $1`,
      [subjectId],
    );
    return true;
  }

  /**
   * private → university once `threshold` distinct users of the subject's
   * university are enrolled (creator included). Atomic; true if promoted now.
   */
  async promoteIfTrusted(
    subjectId: string,
    threshold: number,
  ): Promise<boolean> {
    const rows = await this.rows<{ id: string }>(
      `UPDATE subjects s
       SET visibility = 'university',
           moderation = COALESCE(s.moderation, '{}'::jsonb)
             || jsonb_build_object('promotedAt', now(), 'promotedWithUsers', c.n)
       FROM (
         SELECT count(DISTINCT us.user_id)::int AS n
         FROM user_subjects us
         JOIN users u ON u.id = us.user_id
         JOIN subjects t ON t.id = us.subject_id
         WHERE us.subject_id = $1 AND u.university_id = t.university_id
       ) c
       WHERE s.id = $1 AND s.visibility = 'private' AND s.status = 'active'
         AND c.n >= $2
       RETURNING s.id`,
      [subjectId, threshold],
    );
    return rows.length > 0;
  }

  /** One report per (subject, user); true when it is new. */
  async addReport(
    subjectId: string,
    userId: string,
    reason: SubjectReportReason,
    details: string | null,
  ): Promise<boolean> {
    const rows = await this.rows<{ id: string }>(
      `INSERT INTO subject_reports (subject_id, user_id, reason, details)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ON CONSTRAINT "UQ_subject_reports_subject_user" DO NOTHING
       RETURNING id`,
      [subjectId, userId, reason, details],
    );
    return rows.length > 0;
  }

  /**
   * Active non-official subject with ≥ threshold distinct reports → hidden,
   * pending admin review (W3). Atomic; true if hidden now.
   */
  async hideIfReported(subjectId: string, threshold: number): Promise<boolean> {
    const rows = await this.rows<{ id: string }>(
      `UPDATE subjects s
       SET status = 'hidden',
           moderation = COALESCE(s.moderation, '{}'::jsonb)
             || jsonb_build_object('autoHiddenAt', now(), 'reports', c.n)
       FROM (SELECT count(*)::int AS n FROM subject_reports WHERE subject_id = $1) c
       WHERE s.id = $1 AND s.status = 'active' AND s.source <> 'official'
         AND c.n >= $2
       RETURNING s.id`,
      [subjectId, threshold],
    );
    return rows.length > 0;
  }
}
