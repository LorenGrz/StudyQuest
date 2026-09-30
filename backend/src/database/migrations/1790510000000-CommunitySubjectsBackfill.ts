import { MigrationInterface, QueryRunner } from 'typeorm';
import { normalizeSubjectName } from '../../common/subject-name';
import { UTN_CANONICAL, universityKey } from '../../common/university-name';
import { mapUsersToCatalog } from '../../modules/universities/map-users-to-catalog';

/**
 * Backfill for CommunitySubjectsSchema (plan R1). Reads rows and normalizes in
 * TS with the same `normalizeSubjectName()` / `universityKey()` the API uses;
 * never modifies a pre-existing column (names, codes, legacy strings, FKs from
 * parties/quests stay untouched) and never deletes rows.
 *
 * 1. universities ← DISTINCT subjects.university only (users.university was
 *    free text for a while and must not become catalog entries), grouped by
 *    universityKey(); "Universidad Tecnológica Nacional" is unified into
 *    "Universidad Tecnológica Nacional – FRBA".
 * 2. careers ← DISTINCT (university, career) of subjects ∪ users, only for
 *    universities from step 1; `active`, level `grado`. The curated catalog
 *    (careers/*.json) is applied later by `careers:sync`, which retires what
 *    is not in the source.
 * 3. users ← mapUsersToCatalog(): university_id / career_id by normalized
 *    name. Unmatched users keep NULL and their strings (careers:sync maps them
 *    again after adding catalog universities).
 * 4. subjects: university_id, career_id, name_normalized.
 *    - `career_id` is only a hint/tag: there is ONE subject per
 *      (university, normalized name), shared by every career that takes it;
 *      the explorer filters by university. No subject↔career join table.
 *    - Legacy marker: rows that existed when CommunitySubjectsSchema ran got
 *      source='legacy', visibility='university' from the ADD COLUMN default
 *      (the default is then switched to 'community'/'private'). The hide step
 *      only touches `source='legacy' AND moderation IS NULL AND
 *      status='active'` rows without references (user_subjects, parties,
 *      quests, skill_nodes) → status='hidden'. Rows created later are never
 *      legacy, and a reviewed legacy row (W3 writes `moderation`) is never
 *      re-hidden by a re-run.
 * 5. name_normalized collisions inside one university, needed so the partial
 *    unique index can be built: the keeper is the referenced / most enrolled /
 *    oldest row. Unreferenced duplicates → status='merged',
 *    merged_into_id=keeper (nothing points at them). Referenced duplicates
 *    stay active with a disambiguated key "<normalized> ~<code|id>" (the
 *    normalizer never outputs "~") so their parties/quests/enrollments keep
 *    working; an admin merge (W3) can fold them later. They are logged.
 * 6. name_normalized NOT NULL + partial unique index + GIN trigram index.
 *
 * Re-runnable: inserts are ON CONFLICT DO NOTHING and existing values
 * (ids, name_normalized, merged rows) are kept, so a second pass changes
 * nothing.
 *
 * down: drops the two indexes and the NOT NULL. The backfilled values stay
 * (documented no-op for data): they live only in columns/tables that
 * CommunitySubjectsSchema's down drops, and no legacy data was changed.
 */
type Counted = { name: string; n: number };

interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
  university: string;
  career: string;
  university_id: string | null;
  career_id: string | null;
  name_normalized: string | null;
  source: string;
  status: string;
  merged_into_id: string | null;
  enrolled_count: number;
  created_at: Date;
  reviewed: boolean;
  referenced: boolean;
}

export class CommunitySubjectsBackfill1790510000000 implements MigrationInterface {
  name = 'CommunitySubjectsBackfill1790510000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Universities (from subjects only) ──────────────────────────────
    const uniCandidates = new Map<string, Map<string, Counted>>();
    const subjectUnis: { university: string; n: number }[] =
      await queryRunner.query(
        `SELECT university, count(*)::int AS n FROM subjects GROUP BY university`,
      );
    for (const r of subjectUnis) {
      const name = (r.university ?? '').trim().replace(/\s+/g, ' ');
      const key = universityKey(name);
      if (!key) continue;
      const variants = uniCandidates.get(key) ?? new Map<string, Counted>();
      const c = variants.get(name) ?? { name, n: 0 };
      c.n += r.n;
      variants.set(name, c);
      uniCandidates.set(key, variants);
    }

    const existingUnis = await this.loadUniversities(queryRunner);
    const newUniNames: string[] = [];
    for (const [key, variants] of uniCandidates) {
      if (existingUnis.has(key)) continue;
      newUniNames.push(
        key === universityKey(UTN_CANONICAL)
          ? UTN_CANONICAL
          : pickCanonical([...variants.values()]),
      );
    }
    if (newUniNames.length) {
      await queryRunner.query(
        `INSERT INTO universities (name)
         SELECT unnest($1::varchar[])
         ON CONFLICT ON CONSTRAINT "UQ_universities_name" DO NOTHING`,
        [newUniNames],
      );
    }
    const uniIdByKey = await this.loadUniversities(queryRunner);
    const uniIdOf = (raw: string | null) => uniIdByKey.get(universityKey(raw));

    // ── 2. Careers ─────────────────────────────────────────────────────────
    const careerCandidates = new Map<string, Map<string, Counted>>();
    const careerPairs: { university: string; career: string; n: number }[] =
      await queryRunner.query(`
        SELECT university, career, count(*)::int AS n FROM (
          SELECT university, career FROM subjects
          UNION ALL
          SELECT university, career FROM users
        ) t GROUP BY university, career
      `);
    for (const r of careerPairs) {
      const universityId = uniIdOf(r.university);
      const name = (r.career ?? '').trim().replace(/\s+/g, ' ');
      const nn = normalizeSubjectName(name);
      if (!universityId || !nn) continue;
      const key = `${universityId}|${nn}`;
      const variants = careerCandidates.get(key) ?? new Map<string, Counted>();
      const c = variants.get(name) ?? { name, n: 0 };
      c.n += r.n;
      variants.set(name, c);
      careerCandidates.set(key, variants);
    }

    const careerRows: [string[], string[], string[]] = [[], [], []];
    for (const [key, variants] of careerCandidates) {
      const [universityId, nn] = splitKey(key);
      careerRows[0].push(universityId);
      careerRows[1].push(pickCanonical([...variants.values()]));
      careerRows[2].push(nn);
    }
    if (careerRows[0].length) {
      await queryRunner.query(
        `INSERT INTO careers (university_id, name, name_normalized)
         SELECT * FROM unnest($1::uuid[], $2::varchar[], $3::varchar[])
         ON CONFLICT ON CONSTRAINT "UQ_careers_university_name_normalized"
         DO NOTHING`,
        careerRows,
      );
    }
    const careerIdByKey = new Map<string, string>(
      (
        (await queryRunner.query(
          `SELECT id, university_id, name_normalized FROM careers`,
        )) as { id: string; university_id: string; name_normalized: string }[]
      ).map((c) => [`${c.university_id}|${c.name_normalized}`, c.id]),
    );
    const careerIdOf = (universityId: string | null, career: string) =>
      universityId
        ? careerIdByKey.get(
            `${universityId}|${normalizeSubjectName(career ?? '')}`,
          )
        : undefined;

    // ── 3. Users ───────────────────────────────────────────────────────────
    const usersMapped = await mapUsersToCatalog(queryRunner);

    // ── 4. Subjects ────────────────────────────────────────────────────────
    const refChecks = await this.referenceChecks(queryRunner);
    const subjects: SubjectRow[] = await queryRunner.query(`
      SELECT s.id, s.name, s.code, s.university, s.career, s.university_id,
             s.career_id, s.name_normalized, s.source, s.status,
             s.merged_into_id, s.enrolled_count, s.created_at,
             (s.moderation IS NOT NULL) AS reviewed,
             (${refChecks}) AS referenced
      FROM subjects s
    `);

    const next = new Map<string, SubjectRow>();
    for (const s of subjects) {
      const universityId = s.university_id ?? uniIdOf(s.university) ?? null;
      const row: SubjectRow = {
        ...s,
        university_id: universityId,
        career_id:
          s.career_id ??
          (s.source === 'legacy'
            ? (careerIdOf(universityId, s.career) ?? null)
            : null),
        name_normalized: s.name_normalized ?? normalizeSubjectName(s.name),
      };
      if (
        row.source === 'legacy' &&
        !s.reviewed &&
        row.status === 'active' &&
        !s.referenced
      )
        row.status = 'hidden';
      next.set(s.id, row);
    }

    // ── 5. Collisions ──────────────────────────────────────────────────────
    const groups = new Map<string, SubjectRow[]>();
    const usedKeys = new Set<string>();
    for (const row of next.values()) {
      if (row.status === 'merged' || !row.university_id) continue;
      const key = `${row.university_id}|${row.name_normalized}`;
      usedKeys.add(key);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    const disambiguated: SubjectRow[] = [];
    let merged = 0;
    for (const rows of groups.values()) {
      if (rows.length < 2) continue;
      rows.sort(
        (a, b) =>
          Number(b.referenced) - Number(a.referenced) ||
          b.enrolled_count - a.enrolled_count ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
          a.id.localeCompare(b.id),
      );
      const [keeper, ...dupes] = rows;
      for (const dupe of dupes) {
        if (!dupe.referenced) {
          dupe.status = 'merged';
          dupe.merged_into_id = keeper.id;
          merged += 1;
          continue;
        }
        const base = dupe.name_normalized as string;
        // name_normalized is varchar(255): trim the base, never the suffix.
        const withSuffix = (suffix: string) =>
          `${base.slice(0, 255 - suffix.length - 2)} ~${suffix}`;
        let candidate = withSuffix((dupe.code ?? dupe.id).trim().toLowerCase());
        if (usedKeys.has(`${dupe.university_id}|${candidate}`))
          candidate = withSuffix(dupe.id);
        usedKeys.add(`${dupe.university_id}|${candidate}`);
        dupe.name_normalized = candidate;
        disambiguated.push(dupe);
      }
    }

    const original = new Map(subjects.map((s) => [s.id, s]));
    const changed = [...next.values()].filter((row) => {
      const o = original.get(row.id) as SubjectRow;
      return (
        o.university_id !== row.university_id ||
        o.career_id !== row.career_id ||
        o.name_normalized !== row.name_normalized ||
        o.status !== row.status ||
        o.merged_into_id !== row.merged_into_id
      );
    });
    if (changed.length) {
      await queryRunner.query(
        `UPDATE subjects s
         SET university_id = v.university_id,
             career_id = v.career_id,
             name_normalized = v.name_normalized,
             status = v.status,
             merged_into_id = v.merged_into_id
         FROM unnest($1::uuid[], $2::uuid[], $3::uuid[], $4::varchar[],
                     $5::varchar[], $6::uuid[])
           AS v(id, university_id, career_id, name_normalized, status,
                merged_into_id)
         WHERE s.id = v.id`,
        [
          changed.map((r) => r.id),
          changed.map((r) => r.university_id),
          changed.map((r) => r.career_id),
          changed.map((r) => r.name_normalized),
          changed.map((r) => r.status),
          changed.map((r) => r.merged_into_id),
        ],
      );
    }

    // ── 6. Constraints ─────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE subjects ALTER COLUMN name_normalized SET NOT NULL`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_subjects_university_name_normalized"
      ON subjects (university_id, name_normalized)
      WHERE status <> 'merged'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subjects_name_normalized_trgm"
      ON subjects USING gin (name_normalized gin_trgm_ops)
    `);

    const hidden = [...next.values()].filter(
      (r) => r.status === 'hidden' && original.get(r.id)?.status !== 'hidden',
    ).length;
    console.log(
      `[CommunitySubjectsBackfill] universities +${newUniNames.length}, ` +
        `careers candidates ${careerRows[0].length}, ` +
        `users mapped ${usersMapped.universitiesMapped} (careers ${usersMapped.careersMapped}), ` +
        `subjects updated ${changed.length} (hidden ${hidden}, merged ${merged}, ` +
        `disambiguated ${disambiguated.length})`,
    );
    for (const d of disambiguated) {
      console.log(
        `[CommunitySubjectsBackfill] referenced duplicate kept active: ${d.id} "${d.name}" (${d.university}) → "${d.name_normalized}"`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_subjects_name_normalized_trgm"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_subjects_university_name_normalized"`,
    );
    await queryRunner.query(
      `ALTER TABLE subjects ALTER COLUMN name_normalized DROP NOT NULL`,
    );
  }

  /** universityKey(name) → university id (first by name if two collapse). */
  private async loadUniversities(
    queryRunner: QueryRunner,
  ): Promise<Map<string, string>> {
    const rows: { id: string; name: string }[] = await queryRunner.query(
      `SELECT id, name FROM universities ORDER BY name`,
    );
    const map = new Map<string, string>();
    for (const r of rows) {
      const key = universityKey(r.name);
      if (key && !map.has(key)) map.set(key, r.id);
    }
    return map;
  }

  /** EXISTS(...) OR ... over the tables that reference subjects. */
  private async referenceChecks(queryRunner: QueryRunner): Promise<string> {
    const tables = ['user_subjects', 'parties', 'quests', 'skill_nodes'];
    const present: { t: string }[] = await queryRunner.query(
      `SELECT t FROM unnest($1::text[]) AS t WHERE to_regclass('public.' || t) IS NOT NULL`,
      [tables],
    );
    const checks = present.map(
      ({ t }) => `EXISTS (SELECT 1 FROM ${t} r WHERE r.subject_id = s.id)`,
    );
    return checks.length ? checks.join(' OR ') : 'false';
  }
}

/** Most used spelling, then A→Z. */
function pickCanonical(variants: Counted[]): string {
  return [...variants].sort(
    (a, b) => b.n - a.n || a.name.localeCompare(b.name),
  )[0].name;
}

function splitKey(key: string): [string, string] {
  const i = key.indexOf('|');
  return [key.slice(0, i), key.slice(i + 1)];
}
