import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Official catalog (universities, careers, career_requests) and the columns
 * that link users and subjects to it (plan docs/plans/2026-09-community-subjects.md, R1).
 *
 * Additive only: the legacy string columns users.university/career and
 * subjects.university/career are kept (deprecated). Every statement is
 * IF NOT EXISTS and constraint/index names match the entities, so on a DB
 * that already got this schema from `synchronize` it is a no-op.
 * `subjects.name_normalized` is added nullable here; CommunitySubjectsBackfill
 * fills it, sets NOT NULL and creates the unique/trigram indexes.
 *
 * Also creates pg_trgm/unaccent so they no longer depend on the boot hook in
 * main.ts.
 *
 * down: drops what `up` added. Safe for pre-existing data (no legacy column
 * is touched) but it DELETES catalog links and career requests created after
 * the migration, so take a backup (backup.sh) before reverting in prod.
 * `subjects.code` gets NOT NULL back only if no row has a null code
 * (community subjects); extensions are left in place (main.ts needs them).
 */
export class CommunitySubjectsSchema1790500000000 implements MigrationInterface {
  name = 'CommunitySubjectsSchema1790500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS universities (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        name character varying(200) NOT NULL,
        short_name character varying(40),
        website character varying(300),
        careers_source_urls jsonb NOT NULL DEFAULT '[]',
        last_synced_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_universities" PRIMARY KEY (id),
        CONSTRAINT "UQ_universities_name" UNIQUE (name)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS careers (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        university_id uuid NOT NULL,
        name character varying(200) NOT NULL,
        name_normalized character varying(200) NOT NULL,
        faculty character varying(200),
        level character varying(16) NOT NULL DEFAULT 'grado',
        source_url character varying(500),
        status character varying(16) NOT NULL DEFAULT 'active',
        verified_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_careers" PRIMARY KEY (id),
        CONSTRAINT "UQ_careers_university_name_normalized"
          UNIQUE (university_id, name_normalized),
        CONSTRAINT "FK_careers_university_id" FOREIGN KEY (university_id)
          REFERENCES universities(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS career_requests (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        university_id uuid NOT NULL,
        name character varying(200) NOT NULL,
        status character varying(16) NOT NULL DEFAULT 'pending',
        career_id uuid,
        admin_note character varying(500),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        resolved_at timestamp with time zone,
        CONSTRAINT "PK_career_requests" PRIMARY KEY (id),
        CONSTRAINT "FK_career_requests_user_id" FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT "FK_career_requests_university_id" FOREIGN KEY (university_id)
          REFERENCES universities(id) ON DELETE RESTRICT,
        CONSTRAINT "FK_career_requests_career_id" FOREIGN KEY (career_id)
          REFERENCES careers(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_career_requests_status" ON career_requests (status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_career_requests_user_id" ON career_requests (user_id)`,
    );

    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS university_id uuid,
        ADD COLUMN IF NOT EXISTS career_id uuid,
        ADD COLUMN IF NOT EXISTS pending_career_request_id uuid
    `);
    await addForeignKey(
      queryRunner,
      'users',
      'FK_users_university_id',
      'university_id',
      'universities',
      'SET NULL',
    );
    await addForeignKey(
      queryRunner,
      'users',
      'FK_users_career_id',
      'career_id',
      'careers',
      'SET NULL',
    );
    await addForeignKey(
      queryRunner,
      'users',
      'FK_users_pending_career_request_id',
      'pending_career_request_id',
      'career_requests',
      'SET NULL',
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_university_id" ON users (university_id)`,
    );

    await queryRunner.query(
      `ALTER TABLE subjects ALTER COLUMN code DROP NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE subjects
        ADD COLUMN IF NOT EXISTS university_id uuid,
        ADD COLUMN IF NOT EXISTS career_id uuid,
        ADD COLUMN IF NOT EXISTS name_normalized character varying(255),
        ADD COLUMN IF NOT EXISTS source character varying(16) NOT NULL DEFAULT 'legacy',
        ADD COLUMN IF NOT EXISTS created_by uuid,
        ADD COLUMN IF NOT EXISTS visibility character varying(16) NOT NULL DEFAULT 'university',
        ADD COLUMN IF NOT EXISTS status character varying(16) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS merged_into_id uuid,
        ADD COLUMN IF NOT EXISTS moderation jsonb
    `);
    await addForeignKey(
      queryRunner,
      'subjects',
      'FK_subjects_university_id',
      'university_id',
      'universities',
      'RESTRICT',
    );
    await addForeignKey(
      queryRunner,
      'subjects',
      'FK_subjects_career_id',
      'career_id',
      'careers',
      'SET NULL',
    );
    await addForeignKey(
      queryRunner,
      'subjects',
      'FK_subjects_created_by',
      'created_by',
      'users',
      'SET NULL',
    );
    await addForeignKey(
      queryRunner,
      'subjects',
      'FK_subjects_merged_into_id',
      'merged_into_id',
      'subjects',
      'SET NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE subjects
        DROP CONSTRAINT IF EXISTS "FK_subjects_university_id",
        DROP CONSTRAINT IF EXISTS "FK_subjects_career_id",
        DROP CONSTRAINT IF EXISTS "FK_subjects_created_by",
        DROP CONSTRAINT IF EXISTS "FK_subjects_merged_into_id",
        DROP COLUMN IF EXISTS university_id,
        DROP COLUMN IF EXISTS career_id,
        DROP COLUMN IF EXISTS name_normalized,
        DROP COLUMN IF EXISTS source,
        DROP COLUMN IF EXISTS created_by,
        DROP COLUMN IF EXISTS visibility,
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS merged_into_id,
        DROP COLUMN IF EXISTS moderation
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM subjects WHERE code IS NULL) THEN
          ALTER TABLE subjects ALTER COLUMN code SET NOT NULL;
        ELSE
          RAISE NOTICE 'subjects.code has NULLs (community subjects): left nullable';
        END IF;
      END $$
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_university_id"`);
    await queryRunner.query(`
      ALTER TABLE users
        DROP CONSTRAINT IF EXISTS "FK_users_university_id",
        DROP CONSTRAINT IF EXISTS "FK_users_career_id",
        DROP CONSTRAINT IF EXISTS "FK_users_pending_career_request_id",
        DROP COLUMN IF EXISTS university_id,
        DROP COLUMN IF EXISTS career_id,
        DROP COLUMN IF EXISTS pending_career_request_id
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS career_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS careers`);
    await queryRunner.query(`DROP TABLE IF EXISTS universities`);
  }
}

/** ADD CONSTRAINT … FOREIGN KEY only when a constraint with that name is missing. */
async function addForeignKey(
  queryRunner: QueryRunner,
  table: string,
  name: string,
  column: string,
  refTable: string,
  onDelete: 'RESTRICT' | 'SET NULL' | 'CASCADE',
): Promise<void> {
  await queryRunner.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
        ALTER TABLE ${table} ADD CONSTRAINT "${name}" FOREIGN KEY (${column})
          REFERENCES ${refTable}(id) ON DELETE ${onDelete};
      END IF;
    END $$
  `);
}
