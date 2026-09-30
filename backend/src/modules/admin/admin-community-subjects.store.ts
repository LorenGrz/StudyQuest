import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type {
  SubjectSource,
  SubjectStatus,
  SubjectVisibility,
} from '../subjects/subject.entity';

/** A community subject as the admin panel lists it (W3). */
export interface AdminSubjectRow {
  id: string;
  name: string;
  nameNormalized: string;
  universityId: string | null;
  universityName: string | null;
  careerId: string | null;
  source: SubjectSource;
  visibility: SubjectVisibility;
  status: SubjectStatus;
  enrolledCount: number;
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: Date;
  reportCount: number;
  reportReasons: string[];
}

/** Minimal shape used to validate a merge/rename before mutating. */
export interface AdminSubjectMeta {
  id: string;
  universityId: string | null;
  status: SubjectStatus;
}

/** `mergeSubjects` rejects the operation instead of mutating anything. */
export class SubjectMergeError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'SAME_SUBJECT'
      | 'ALREADY_MERGED'
      | 'DIFFERENT_UNIVERSITY',
    message: string,
  ) {
    super(message);
  }
}

interface Runner {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

const columns = `
  s.id, s.name, s.name_normalized AS "nameNormalized",
  s.university_id AS "universityId", un.name AS "universityName",
  s.career_id AS "careerId", s.source, s.visibility, s.status,
  s.enrolled_count AS "enrolledCount", s.created_by AS "createdBy",
  usr.username AS "createdByUsername", s.created_at AS "createdAt",
  COALESCE(rc.n, 0)::int AS "reportCount",
  COALESCE(rc.reasons, ARRAY[]::text[]) AS "reportReasons"`;

const joins = `
  FROM subjects s
  LEFT JOIN universities un ON un.id = s.university_id
  LEFT JOIN users usr ON usr.id = s.created_by
  LEFT JOIN (
    SELECT subject_id, count(*)::int AS n, array_agg(DISTINCT reason) AS reasons
    FROM subject_reports
    GROUP BY subject_id
  ) rc ON rc.subject_id = s.id`;

/**
 * SQL for the admin panel's community-subjects tab (W3): listing, publish,
 * rename, hide/unhide and merge. Raw parameterized queries, same style as
 * CommunitySubjectsStore; the service holds the HTTP-facing rules.
 */
@Injectable()
export class AdminCommunitySubjectsStore {
  private runner: Runner;

  constructor(private readonly dataSource: DataSource) {
    this.runner = dataSource;
  }

  transaction<T>(
    fn: (tx: AdminCommunitySubjectsStore) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction((em: EntityManager) => {
      const tx = new AdminCommunitySubjectsStore(this.dataSource);
      tx.runner = em;
      return fn(tx);
    });
  }

  private async rows<T>(sql: string, params: unknown[]): Promise<T[]> {
    const result = await this.runner.query(sql, params);
    if (
      Array.isArray(result) &&
      result.length === 2 &&
      Array.isArray(result[0]) &&
      typeof result[1] === 'number'
    )
      return result[0] as T[];
    return result as T[];
  }

  /** Community subjects created in the last 7 days. */
  listNew(limit = 100): Promise<AdminSubjectRow[]> {
    return this.rows<AdminSubjectRow>(
      `SELECT ${columns} ${joins}
       WHERE s.source = 'community' AND s.status = 'active'
         AND s.created_at >= now() - interval '7 days'
       ORDER BY s.created_at DESC
       LIMIT $1`,
      [limit],
    );
  }

  /** Any non-merged subject with at least one report, most reported first. */
  listReported(limit = 100): Promise<AdminSubjectRow[]> {
    return this.rows<AdminSubjectRow>(
      `SELECT ${columns} ${joins}
       WHERE s.status <> 'merged' AND COALESCE(rc.n, 0) > 0
       ORDER BY COALESCE(rc.n, 0) DESC, s.created_at DESC
       LIMIT $1`,
      [limit],
    );
  }

  /** Still private but enrolled_count >= 2 (stuck below auto-promotion). */
  listPrivateWithUsers(limit = 100): Promise<AdminSubjectRow[]> {
    return this.rows<AdminSubjectRow>(
      `SELECT ${columns} ${joins}
       WHERE s.visibility = 'private' AND s.status = 'active'
         AND s.enrolled_count >= 2
       ORDER BY s.enrolled_count DESC, s.created_at DESC
       LIMIT $1`,
      [limit],
    );
  }

  async findMeta(id: string): Promise<AdminSubjectMeta | null> {
    const [row] = await this.rows<AdminSubjectMeta>(
      `SELECT id, university_id AS "universityId", status
       FROM subjects WHERE id = $1`,
      [id],
    );
    return row ?? null;
  }

  /** Another active/hidden subject of the same university already holds `key`. */
  async findClash(
    universityId: string,
    nameNormalized: string,
    excludeId: string,
  ): Promise<{ id: string } | null> {
    const [row] = await this.rows<{ id: string }>(
      `SELECT id FROM subjects
       WHERE university_id = $1 AND name_normalized = $2
         AND status <> 'merged' AND id <> $3`,
      [universityId, nameNormalized, excludeId],
    );
    return row ?? null;
  }

  /** `visibility` → 'university'. False when the subject is missing/not active. */
  async publish(id: string, adminId: string): Promise<boolean> {
    const rows = await this.rows<{ id: string }>(
      `UPDATE subjects
       SET visibility = 'university',
           moderation = COALESCE(moderation, '{}'::jsonb)
             || jsonb_build_object('admin', jsonb_build_object('action', 'publish', 'by', $2, 'at', now()))
       WHERE id = $1 AND status = 'active'
       RETURNING id`,
      [id, adminId],
    );
    return rows.length > 0;
  }

  async hide(id: string, adminId: string): Promise<boolean> {
    const rows = await this.rows<{ id: string }>(
      `UPDATE subjects
       SET status = 'hidden',
           moderation = COALESCE(moderation, '{}'::jsonb)
             || jsonb_build_object('admin', jsonb_build_object('action', 'hide', 'by', $2, 'at', now()))
       WHERE id = $1 AND status = 'active'
       RETURNING id`,
      [id, adminId],
    );
    return rows.length > 0;
  }

  async unhide(id: string, adminId: string): Promise<boolean> {
    const rows = await this.rows<{ id: string }>(
      `UPDATE subjects
       SET status = 'active',
           moderation = COALESCE(moderation, '{}'::jsonb)
             || jsonb_build_object('admin', jsonb_build_object('action', 'unhide', 'by', $2, 'at', now()))
       WHERE id = $1 AND status = 'hidden'
       RETURNING id`,
      [id, adminId],
    );
    return rows.length > 0;
  }

  /** Sets `name` and `name_normalized` explicitly (never relies on @BeforeUpdate). */
  async rename(
    id: string,
    name: string,
    nameNormalized: string,
    adminId: string,
  ): Promise<boolean> {
    const rows = await this.rows<{ id: string }>(
      `UPDATE subjects
       SET name = $2, name_normalized = $3,
           moderation = COALESCE(moderation, '{}'::jsonb)
             || jsonb_build_object('admin', jsonb_build_object('action', 'rename', 'by', $4, 'at', now()))
       WHERE id = $1 AND status <> 'merged'
       RETURNING id`,
      [id, name, nameNormalized, adminId],
    );
    return rows.length > 0;
  }

  /**
   * A → B in one transaction (call inside `transaction()`): moves
   * user_subjects (deduped), parties, quests, skill_nodes and subject_reports
   * (deduped) from A to B, recomputes B.enrolled_count, marks A merged. Locks
   * both rows first (fixed id order) so a concurrent merge can't race.
   */
  async mergeSubjects(
    fromId: string,
    toId: string,
    adminId: string,
  ): Promise<{ enrolledCount: number }> {
    if (fromId === toId)
      throw new SubjectMergeError(
        'SAME_SUBJECT',
        'No se puede fusionar una materia consigo misma',
      );

    const lockIds = [fromId, toId].sort();
    const locked = await this.rows<{
      id: string;
      universityId: string | null;
      status: SubjectStatus;
    }>(
      `SELECT id, university_id AS "universityId", status
       FROM subjects WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`,
      [lockIds],
    );
    const from = locked.find((r) => r.id === fromId);
    const to = locked.find((r) => r.id === toId);
    if (!from || !to)
      throw new SubjectMergeError('NOT_FOUND', 'Materia no encontrada');
    if (from.status === 'merged' || to.status === 'merged')
      throw new SubjectMergeError(
        'ALREADY_MERGED',
        'Una de las materias ya fue fusionada',
      );
    if (from.universityId !== to.universityId)
      throw new SubjectMergeError(
        'DIFFERENT_UNIVERSITY',
        'Las materias son de universidades distintas',
      );

    // user_subjects: users already in B keep just their B row.
    await this.runner.query(
      `DELETE FROM user_subjects
       WHERE subject_id = $1 AND user_id IN (
         SELECT user_id FROM user_subjects WHERE subject_id = $2
       )`,
      [fromId, toId],
    );
    await this.runner.query(
      `UPDATE user_subjects SET subject_id = $2 WHERE subject_id = $1`,
      [fromId, toId],
    );

    await this.runner.query(
      `UPDATE parties SET subject_id = $2 WHERE subject_id = $1`,
      [fromId, toId],
    );
    await this.runner.query(
      `UPDATE quests SET subject_id = $2 WHERE subject_id = $1`,
      [fromId, toId],
    );
    await this.runner.query(
      `UPDATE skill_nodes SET subject_id = $2 WHERE subject_id = $1`,
      [fromId, toId],
    );

    // subject_reports: one row per (subject, user) — a user who reported both
    // keeps only the B row.
    await this.runner.query(
      `DELETE FROM subject_reports
       WHERE subject_id = $1 AND user_id IN (
         SELECT user_id FROM subject_reports WHERE subject_id = $2
       )`,
      [fromId, toId],
    );
    await this.runner.query(
      `UPDATE subject_reports SET subject_id = $2 WHERE subject_id = $1`,
      [fromId, toId],
    );

    const [{ n }] = await this.rows<{ n: number }>(
      `SELECT count(*)::int AS n FROM user_subjects WHERE subject_id = $1`,
      [toId],
    );
    await this.runner.query(
      `UPDATE subjects SET enrolled_count = $2 WHERE id = $1`,
      [toId, n],
    );

    await this.runner.query(
      `UPDATE subjects
       SET status = 'merged', merged_into_id = $2,
           moderation = COALESCE(moderation, '{}'::jsonb)
             || jsonb_build_object('admin', jsonb_build_object('action', 'merge_into', 'target', $2::text, 'by', $3, 'at', now()))
       WHERE id = $1`,
      [fromId, toId, adminId],
    );
    await this.runner.query(
      `UPDATE subjects
       SET moderation = COALESCE(moderation, '{}'::jsonb)
             || jsonb_build_object('admin', jsonb_build_object('action', 'merge_receive', 'source', $2::text, 'by', $3, 'at', now()))
       WHERE id = $1`,
      [toId, fromId, adminId],
    );

    return { enrolledCount: n };
  }
}
