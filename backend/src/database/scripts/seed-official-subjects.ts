/**
 * Seeds the official informática/sistemas subjects (`OFFICIAL_SUBJECTS`,
 * task C2). Needs the careers catalog applied first (`careers:sync`). One
 * transaction; idempotent (a second run reports 0 changes). Active legacy
 * subjects with the same name are never modified.
 *
 * Usage (from backend/):
 *   pnpm subjects:seed-official --dry-run
 *   pnpm subjects:seed-official
 * Prod (inside the api container):
 *   node dist/database/scripts/seed-official-subjects.js [--dry-run]
 */
import { config } from 'dotenv';
config({ path: '../.env' });

import { DataSource, QueryRunner } from 'typeorm';
import { postgresConnectionOptions } from '../../config/postgres-connection';
import { OFFICIAL_SUBJECTS } from '../seeds/data/official-subjects';
import {
  DbCareerRef,
  DbSubjectRow,
  DbUniversityRef,
  SeedOfficialPlan,
  planSeedOfficial,
} from './seed-official-subjects.plan';

async function readDb(qr: QueryRunner) {
  const universities = (await qr.query(
    `SELECT id, name FROM universities`,
  )) as DbUniversityRef[];
  const careers = (await qr.query(
    `SELECT id, university_id AS "universityId", name_normalized AS "nameNormalized"
     FROM careers WHERE status = 'active'`,
  )) as DbCareerRef[];
  const subjects = (await qr.query(
    `SELECT id, university_id AS "universityId", university,
            name_normalized AS "nameNormalized", name, code, year,
            career_id AS "careerId", description, source, status, visibility,
            moderation IS NOT NULL AS moderated
     FROM subjects`,
  )) as DbSubjectRow[];
  return { universities, careers, subjects };
}

async function apply(qr: QueryRunner, plan: SeedOfficialPlan): Promise<void> {
  // UNIQUE(code, university) is checked per statement: free every code that
  // changes hands first, then update, then insert (inserts may reuse them).
  const recoded = plan.updates.filter((u) => u.changes.includes('code'));
  if (recoded.length) {
    await qr.query(
      `UPDATE subjects SET code = NULL WHERE id = ANY($1::uuid[])`,
      [recoded.map((u) => u.id)],
    );
  }
  for (const u of plan.updates) {
    const s = u.values;
    await qr.query(
      `UPDATE subjects SET name = $2, code = $3, description = $4, year = $5,
         career_id = $6, updated_at = now()
         ${u.promotedFrom ? `, source = 'official', visibility = 'university', status = 'active'` : ''}
       WHERE id = $1`,
      [u.id, s.name, s.code, s.description, s.year, s.careerId],
    );
  }
  for (const s of plan.inserts) {
    await qr.query(
      `INSERT INTO subjects (name, code, description, university, career, year,
         university_id, career_id, name_normalized, source, visibility, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'official', 'university', 'active')`,
      [
        s.name,
        s.code,
        s.description,
        s.university,
        s.career,
        s.year,
        s.universityId,
        s.careerId,
        s.nameNormalized,
      ],
    );
  }
}

function print(plan: SeedOfficialPlan): void {
  const promoted = plan.updates.filter((u) => u.promotedFrom);
  console.log(
    `Oficiales: +${plan.inserts.length} nuevas, ~${plan.updates.length - promoted.length} actualizadas, ` +
      `${promoted.length} promovidas (legacy oculta por el backfill / comunidad → oficial), ${plan.unchanged} sin cambios.`,
  );
  for (const u of plan.updates)
    console.log(
      `    ~ ${u.values.university} / ${u.values.name}` +
        (u.promotedFrom ? ` [${u.promotedFrom} → official]` : '') +
        (u.changes.length ? ` (${u.changes.join(', ')})` : ''),
    );
  if (plan.kept.length) {
    console.log(`Con el mismo nombre, sin tocar: ${plan.kept.length}`);
    for (const k of plan.kept)
      console.log(`    = ${k.university} / ${k.name} (${k.reason})`);
  }
  for (const w of plan.warnings) console.warn(`AVISO: ${w}`);
  for (const e of plan.errors) console.error(`ERROR: ${e}`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const ds = new DataSource({
    type: 'postgres',
    ...postgresConnectionOptions(),
    logging: false,
  });
  await ds.initialize();
  const qr = ds.createQueryRunner();
  await qr.startTransaction();
  try {
    const db = await readDb(qr);
    const plan = planSeedOfficial(
      OFFICIAL_SUBJECTS,
      db.universities,
      db.careers,
      db.subjects,
    );
    print(plan);
    if (plan.errors.length) {
      await qr.rollbackTransaction();
      console.error('Hay errores: no se aplicó nada.');
      process.exitCode = 1;
      return;
    }
    await apply(qr, plan);
    console.log(
      `Cambios: ${plan.inserts.length + plan.updates.length}${dryRun ? ' (dry-run)' : ''}`,
    );
    if (dryRun) await qr.rollbackTransaction();
    else await qr.commitTransaction();
  } catch (err) {
    if (qr.isTransactionActive) await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
