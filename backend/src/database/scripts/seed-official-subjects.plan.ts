import { normalizeSubjectName } from '../../common/subject-name';
import { universityKey } from '../../common/university-name';
import type { OfficialSubjectRow } from '../seeds/data/official-subjects';

export interface DbUniversityRef {
  id: string;
  name: string;
}

export interface DbCareerRef {
  id: string;
  universityId: string;
  nameNormalized: string;
}

export interface DbSubjectRow {
  id: string;
  universityId: string | null;
  university: string;
  nameNormalized: string;
  name: string;
  code: string | null;
  year: number;
  careerId: string | null;
  description: string | null;
  source: string;
  status: string;
  visibility: string;
}

export interface OfficialSubjectValues {
  universityId: string;
  university: string;
  career: string;
  careerId: string;
  name: string;
  nameNormalized: string;
  code: string | null;
  year: number;
  description: string | null;
}

export interface SeedOfficialPlan {
  inserts: OfficialSubjectValues[];
  /** Official rows whose data changed, and hidden-legacy/community rows promoted to official. */
  updates: {
    id: string;
    values: OfficialSubjectValues;
    changes: string[];
    promotedFrom: string | null;
  }[];
  /** Active legacy rows with the same name: left exactly as they are. */
  keptLegacy: { id: string; name: string; university: string }[];
  unchanged: number;
  errors: string[];
  warnings: string[];
}

const COMPARED = ['name', 'code', 'year', 'careerId', 'description'] as const;

/**
 * Pure plan for seeding `OFFICIAL_SUBJECTS`. One subject per (university,
 * normalized name): a subject shared by several careers is stored once,
 * tagged with the first career that lists it (career is a hint only).
 *
 * Existing rows with the same key:
 *  - `official` → updated when the catalog data changed;
 *  - active `legacy` → untouched (it may have parties/quests/enrollments);
 *  - hidden `legacy` or `community` → promoted to official + public.
 * A code already used by another subject of the same university string is
 * dropped (`UNIQUE(code, university)`) with a warning.
 */
export function planSeedOfficial(
  rows: OfficialSubjectRow[],
  universities: DbUniversityRef[],
  careers: DbCareerRef[],
  subjects: DbSubjectRow[],
): SeedOfficialPlan {
  const errors: string[] = [];
  const warnings: string[] = [];
  const universityByKey = new Map(
    universities.map((u) => [universityKey(u.name), u]),
  );
  const careerByKey = new Map(
    careers.map((c) => [`${c.universityId}|${c.nameNormalized}`, c.id]),
  );

  const grouped = new Map<string, OfficialSubjectValues>();
  for (const row of rows) {
    const uni = universityByKey.get(universityKey(row.university));
    if (!uni) {
      errors.push(
        `Universidad sin catálogo (correr careers:sync): ${row.university}`,
      );
      continue;
    }
    const careerId = careerByKey.get(
      `${uni.id}|${normalizeSubjectName(row.career)}`,
    );
    if (!careerId) {
      errors.push(`Carrera sin catálogo: ${row.university} / ${row.career}`);
      continue;
    }
    const nameNormalized = normalizeSubjectName(row.name);
    const key = `${uni.id}|${nameNormalized}`;
    const prev = grouped.get(key);
    if (prev) {
      prev.year = Math.min(prev.year, row.year);
      continue;
    }
    grouped.set(key, {
      universityId: uni.id,
      university: uni.name,
      career: row.career,
      careerId,
      name: row.name,
      nameNormalized,
      code: row.code,
      year: row.year,
      description: row.description ?? null,
    });
  }

  const existingByKey = new Map<string, DbSubjectRow>();
  const codesInUse = new Map<string, string>(); // `${university}|${code}` → subject id
  for (const s of subjects) {
    if (s.code) codesInUse.set(`${s.university}|${s.code}`, s.id);
    if (s.status !== 'merged' && s.universityId)
      existingByKey.set(`${s.universityId}|${s.nameNormalized}`, s);
  }

  const plan: SeedOfficialPlan = {
    inserts: [],
    updates: [],
    keptLegacy: [],
    unchanged: 0,
    errors,
    warnings,
  };

  // Rows this run rewrites give up their current code first (the apply step
  // nulls them before updating), so a code moving between two rows is free.
  for (const key of grouped.keys()) {
    const s = existingByKey.get(key);
    if (s?.code && !(s.source === 'legacy' && s.status === 'active'))
      codesInUse.delete(`${s.university}|${s.code}`);
  }

  for (const [key, values] of grouped) {
    const existing = existingByKey.get(key);
    if (existing?.source === 'legacy' && existing.status === 'active') {
      plan.keptLegacy.push({
        id: existing.id,
        name: existing.name,
        university: existing.university,
      });
      continue;
    }

    // The unique index is (code, university string); converted legacy rows
    // keep their own string, so check against it.
    const universityString = existing?.university ?? values.university;
    if (values.code) {
      const codeKey = `${universityString}|${values.code}`;
      if (codesInUse.has(codeKey)) {
        warnings.push(
          `Código ${values.code} ya usado en ${universityString}; "${values.name}" queda sin código.`,
        );
        values.code = null;
      } else {
        codesInUse.set(codeKey, existing?.id ?? 'new');
      }
    }

    if (!existing) {
      plan.inserts.push(values);
      continue;
    }
    const promotedFrom =
      existing.source === 'official'
        ? null
        : `${existing.source}/${existing.status}`;
    const changes = COMPARED.filter(
      (k) => (existing[k] ?? null) !== (values[k] ?? null),
    ) as string[];
    // Official updates only touch catalog data, never status/visibility: an
    // admin may have hidden an official subject on purpose (W3).
    if (!changes.length && !promotedFrom) {
      plan.unchanged++;
      continue;
    }
    plan.updates.push({ id: existing.id, values, changes, promotedFrom });
  }

  return plan;
}
