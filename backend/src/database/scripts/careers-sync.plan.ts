import { normalizeSubjectName } from '../../common/subject-name';
import { universityKey } from '../../common/university-name';

/** Shape of `seeds/data/careers/<slug>.json` (validated by careers:validate). */
export interface CatalogFile {
  university: {
    name: string;
    shortName: string;
    website: string;
    careersSourceUrls: string[];
  };
  careers: {
    name: string;
    faculty: string;
    level: 'grado' | 'pregrado';
    sourceUrl: string;
  }[];
}

export interface DbUniversity {
  id: string;
  name: string;
  shortName: string | null;
  website: string | null;
  careersSourceUrls: string[];
}

export interface DbCareer {
  id: string;
  universityId: string;
  name: string;
  nameNormalized: string;
  faculty: string | null;
  level: string;
  sourceUrl: string | null;
  status: string;
  /** Linked from an approved career request: an admin created it on purpose. */
  approvedByAdmin: boolean;
}

export interface UniversityValues {
  name: string;
  shortName: string;
  website: string;
  careersSourceUrls: string[];
}

export interface CareerValues {
  name: string;
  nameNormalized: string;
  faculty: string;
  level: string;
  sourceUrl: string;
  status: 'active';
}

export interface UniversityPlan {
  file: string;
  /** null → insert a new university. */
  universityId: string | null;
  university: UniversityValues;
  universityChanges: string[];
  inserts: CareerValues[];
  updates: { id: string; values: CareerValues; changes: string[] }[];
  retires: { id: string; name: string }[];
}

export interface CareersSyncPlan {
  universities: UniversityPlan[];
  /** DB universities that no catalog file covers (left untouched). */
  uncovered: string[];
  warnings: string[];
}

function diff<T extends object>(
  current: Partial<Record<keyof T, unknown>>,
  next: T,
): string[] {
  return (Object.keys(next) as (keyof T)[]).filter(
    (k) => JSON.stringify(current[k] ?? null) !== JSON.stringify(next[k]),
  ) as string[];
}

/**
 * Pure diff between the careers catalog files and the DB. Matching is by
 * universityKey() for universities and normalizeSubjectName() for careers, so
 * accents/case/roman numerals never create duplicates. Careers missing from a
 * file are retired (never deleted), except the ones an admin approved from a
 * career request. Running the plan's output and planning again yields no ops.
 */
export function planCareersSync(
  files: { file: string; data: CatalogFile }[],
  dbUniversities: DbUniversity[],
  dbCareers: DbCareer[],
): CareersSyncPlan {
  const warnings: string[] = [];
  const byKey = new Map<string, DbUniversity>();
  for (const u of dbUniversities) {
    const key = universityKey(u.name);
    if (byKey.has(key)) {
      warnings.push(
        `Universidades duplicadas en la base para "${u.name}"; se usa "${byKey.get(key)!.name}".`,
      );
      continue;
    }
    byKey.set(key, u);
  }

  const covered = new Set<string>();
  const universities: UniversityPlan[] = files.map(({ file, data }) => {
    const key = universityKey(data.university.name);
    covered.add(key);
    const existing = byKey.get(key) ?? null;
    const university: UniversityValues = {
      name: data.university.name,
      shortName: data.university.shortName,
      website: data.university.website,
      careersSourceUrls: data.university.careersSourceUrls,
    };

    const current = new Map(
      existing
        ? dbCareers
            .filter((c) => c.universityId === existing.id)
            .map((c) => [c.nameNormalized, c])
        : [],
    );
    const seen = new Set<string>();
    const inserts: CareerValues[] = [];
    const updates: UniversityPlan['updates'] = [];

    for (const c of data.careers) {
      const values: CareerValues = {
        name: c.name,
        nameNormalized: normalizeSubjectName(c.name),
        faculty: c.faculty,
        level: c.level,
        sourceUrl: c.sourceUrl,
        status: 'active',
      };
      if (seen.has(values.nameNormalized)) {
        warnings.push(`${file}: carrera repetida "${c.name}", se ignora.`);
        continue;
      }
      seen.add(values.nameNormalized);
      const row = current.get(values.nameNormalized);
      if (!row) {
        inserts.push(values);
        continue;
      }
      const changes = diff(row, values);
      if (changes.length) updates.push({ id: row.id, values, changes });
    }

    const retires = [...current.values()]
      .filter(
        (c) =>
          !seen.has(c.nameNormalized) &&
          c.status === 'active' &&
          !c.approvedByAdmin,
      )
      .map((c) => ({ id: c.id, name: c.name }));

    return {
      file,
      universityId: existing?.id ?? null,
      university,
      universityChanges: existing ? diff(existing, university) : ['(nueva)'],
      inserts,
      updates,
      retires,
    };
  });

  const uncovered = [...byKey.entries()]
    .filter(([key]) => !covered.has(key))
    .map(([, u]) => u.name);

  return { universities, uncovered, warnings };
}

export function countChanges(plan: CareersSyncPlan): number {
  return plan.universities.reduce(
    (n, u) =>
      n +
      (u.universityChanges.length ? 1 : 0) +
      u.inserts.length +
      u.updates.length +
      u.retires.length,
    0,
  );
}
