/**
 * Applies the official careers catalog (`seeds/data/careers/*.json`) to the
 * DB: upserts universities and careers, retires careers that left the source
 * (never deletes), then links users to the catalog by name. One transaction;
 * idempotent (a second run reports 0 changes).
 *
 * Usage (from backend/):
 *   pnpm careers:sync --dry-run        # print the diff, roll back
 *   pnpm careers:sync                  # apply
 * Prod (inside the api container, run by deploy.sh):
 *   node dist/database/scripts/careers-sync.js [--dry-run]
 */
import { config } from 'dotenv';
config({ path: '../.env' });

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { DataSource, QueryRunner } from 'typeorm';
import { postgresConnectionOptions } from '../../config/postgres-connection';
import { mapUsersToCatalog } from '../../modules/universities/map-users-to-catalog';
import {
  CatalogFile,
  CareersSyncPlan,
  DbCareer,
  DbUniversity,
  countChanges,
  planCareersSync,
} from './careers-sync.plan';

const CATALOG_DIR = join(__dirname, '../seeds/data/careers');

function loadCatalog(): { file: string; data: CatalogFile }[] {
  return readdirSync(CATALOG_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => ({
      file,
      data: JSON.parse(
        readFileSync(join(CATALOG_DIR, file), 'utf8'),
      ) as CatalogFile,
    }));
}

async function readDb(
  qr: QueryRunner,
): Promise<{ universities: DbUniversity[]; careers: DbCareer[] }> {
  const universities = (await qr.query(
    `SELECT id, name, short_name AS "shortName", website,
            careers_source_urls AS "careersSourceUrls"
     FROM universities ORDER BY created_at, name`,
  )) as DbUniversity[];
  const careers = (await qr.query(
    `SELECT c.id, c.university_id AS "universityId", c.name,
            c.name_normalized AS "nameNormalized", c.faculty, c.level,
            c.source_url AS "sourceUrl", c.status,
            EXISTS (SELECT 1 FROM career_requests r
                    WHERE r.career_id = c.id AND r.status = 'approved')
              AS "approvedByAdmin"
     FROM careers c`,
  )) as DbCareer[];
  return { universities, careers };
}

async function apply(qr: QueryRunner, plan: CareersSyncPlan): Promise<void> {
  for (const u of plan.universities) {
    const v = u.university;
    let universityId = u.universityId;
    if (!universityId) {
      const rows = (await qr.query(
        `INSERT INTO universities (name, short_name, website, careers_source_urls, last_synced_at)
         VALUES ($1, $2, $3, $4::jsonb, now()) RETURNING id`,
        [v.name, v.shortName, v.website, JSON.stringify(v.careersSourceUrls)],
      )) as { id: string }[];
      universityId = rows[0].id;
    } else if (u.universityChanges.length) {
      await qr.query(
        `UPDATE universities SET name = $2, short_name = $3, website = $4,
           careers_source_urls = $5::jsonb, last_synced_at = now(), updated_at = now()
         WHERE id = $1`,
        [
          universityId,
          v.name,
          v.shortName,
          v.website,
          JSON.stringify(v.careersSourceUrls),
        ],
      );
    } else {
      // Not a change: only records when the catalog was last checked.
      await qr.query(
        `UPDATE universities SET last_synced_at = now() WHERE id = $1`,
        [universityId],
      );
    }

    for (const c of u.inserts) {
      await qr.query(
        `INSERT INTO careers (university_id, name, name_normalized, faculty, level, source_url, status, verified_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', now())`,
        [
          universityId,
          c.name,
          c.nameNormalized,
          c.faculty,
          c.level,
          c.sourceUrl,
        ],
      );
    }
    for (const { id, values: c } of u.updates) {
      await qr.query(
        `UPDATE careers SET name = $2, faculty = $3, level = $4, source_url = $5,
           status = 'active', verified_at = now(), updated_at = now()
         WHERE id = $1`,
        [id, c.name, c.faculty, c.level, c.sourceUrl],
      );
    }
    if (u.retires.length) {
      await qr.query(
        `UPDATE careers SET status = 'retired', updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [u.retires.map((r) => r.id)],
      );
    }
  }
}

function print(plan: CareersSyncPlan): void {
  for (const u of plan.universities) {
    const head = u.universityId
      ? u.universityChanges.length
        ? `~ ${u.university.name} (${u.universityChanges.join(', ')})`
        : `= ${u.university.name}`
      : `+ ${u.university.name} (nueva)`;
    console.log(
      `${head}: +${u.inserts.length} ~${u.updates.length} -${u.retires.length}`,
    );
    for (const c of u.updates)
      console.log(`    ~ ${c.values.name} (${c.changes.join(', ')})`);
    for (const c of u.retires) console.log(`    - ${c.name} → retired`);
  }
  if (plan.uncovered.length)
    console.log(
      `Universidades en la base sin archivo de catálogo (sin tocar): ${plan.uncovered.join(' · ')}`,
    );
  for (const w of plan.warnings) console.warn(`AVISO: ${w}`);
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
    const plan = planCareersSync(loadCatalog(), db.universities, db.careers);
    print(plan);
    await apply(qr, plan);
    const mapped = await mapUsersToCatalog(qr);
    console.log(
      `Usuarios vinculados: ${mapped.universitiesMapped} a universidad, ${mapped.careersMapped} a carrera.`,
    );
    console.log(`Cambios: ${countChanges(plan)}${dryRun ? ' (dry-run)' : ''}`);
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
