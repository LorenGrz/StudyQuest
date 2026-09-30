import { normalizeSubjectName } from '../../common/subject-name';
import { universityKey } from '../../common/university-name';

/** Anything with `query(sql, params)`: QueryRunner, DataSource, EntityManager. */
export interface SqlRunner {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface MapUsersResult {
  universitiesMapped: number;
  careersMapped: number;
}

/**
 * Links users to the catalog by name, only where the link is still missing:
 *  - `university_id IS NULL` → the catalog university whose universityKey()
 *    matches `users.university` (UTN alias included), or its short name;
 *  - `career_id IS NULL` (and no pending career request) → the career of that
 *    university whose normalized name matches `users.career`.
 * Unmatched users keep NULL and their legacy strings. Never touches the
 * strings, never creates universities or careers.
 *
 * Called by the CommunitySubjectsBackfill migration and meant to be re-run by
 * `careers:sync` after it inserts catalog universities/careers. Idempotent.
 */
export async function mapUsersToCatalog(
  db: SqlRunner,
): Promise<MapUsersResult> {
  const universities = (await db.query(
    `SELECT id, name, short_name FROM universities ORDER BY name`,
  )) as { id: string; name: string; short_name: string | null }[];
  const universityIdByKey = new Map<string, string>();
  for (const u of universities) {
    const key = universityKey(u.name);
    if (key && !universityIdByKey.has(key)) universityIdByKey.set(key, u.id);
  }
  // Legacy free text is often just the acronym ("Unsam", "UBA"). Full names
  // win on a clash, so an acronym never shadows another university's name.
  for (const u of universities) {
    const key = universityKey(u.short_name);
    if (key && !universityIdByKey.has(key)) universityIdByKey.set(key, u.id);
  }

  const unmappedUsers = (await db.query(
    `SELECT id, university FROM users
     WHERE university_id IS NULL AND university <> ''`,
  )) as { id: string; university: string }[];
  const userIds: string[] = [];
  const userUniversityIds: string[] = [];
  for (const u of unmappedUsers) {
    const universityId = universityIdByKey.get(universityKey(u.university));
    if (!universityId) continue;
    userIds.push(u.id);
    userUniversityIds.push(universityId);
  }
  if (userIds.length) {
    await db.query(
      `UPDATE users u SET university_id = v.university_id
       FROM unnest($1::uuid[], $2::uuid[]) AS v(id, university_id)
       WHERE u.id = v.id AND u.university_id IS NULL`,
      [userIds, userUniversityIds],
    );
  }

  const careers = (await db.query(
    `SELECT id, university_id, name_normalized FROM careers`,
  )) as { id: string; university_id: string; name_normalized: string }[];
  const careerIdByKey = new Map(
    careers.map((c) => [`${c.university_id}|${c.name_normalized}`, c.id]),
  );
  const careerless = (await db.query(
    `SELECT id, university_id, career FROM users
     WHERE career_id IS NULL AND university_id IS NOT NULL
       AND pending_career_request_id IS NULL AND career <> ''`,
  )) as { id: string; university_id: string; career: string }[];
  const careerUserIds: string[] = [];
  const careerIds: string[] = [];
  for (const u of careerless) {
    const careerId = careerIdByKey.get(
      `${u.university_id}|${normalizeSubjectName(u.career)}`,
    );
    if (!careerId) continue;
    careerUserIds.push(u.id);
    careerIds.push(careerId);
  }
  if (careerUserIds.length) {
    await db.query(
      `UPDATE users u SET career_id = v.career_id
       FROM unnest($1::uuid[], $2::uuid[]) AS v(id, career_id)
       WHERE u.id = v.id AND u.career_id IS NULL`,
      [careerUserIds, careerIds],
    );
  }

  return {
    universitiesMapped: userIds.length,
    careersMapped: careerUserIds.length,
  };
}
