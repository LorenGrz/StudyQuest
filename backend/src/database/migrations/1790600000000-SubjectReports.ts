import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Community subjects R2 (plan docs/plans/2026-09-community-subjects.md):
 *
 * - `subject_reports`: one row per (subject, user) for POST
 *   /subjects/:id/report; 3 distinct reporters auto-hide a non-official
 *   subject. CASCADE on both FKs: a report has no meaning without them.
 * - `IDX_subjects_created_by`: the per-user daily creation count and "my
 *   private subjects" filters look rows up by creator.
 *
 * Additive and idempotent (IF NOT EXISTS; names match SubjectReport and the
 * Subject entity so `synchronize` is a no-op on a synced DB).
 *
 * down: drops the table (its reports are lost — take a backup first in prod)
 * and the index. No other data is touched.
 */
export class SubjectReports1790600000000 implements MigrationInterface {
  name = 'SubjectReports1790600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS subject_reports (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        subject_id uuid NOT NULL,
        user_id uuid NOT NULL,
        reason character varying(16) NOT NULL DEFAULT 'other',
        details character varying(300),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subject_reports" PRIMARY KEY (id),
        CONSTRAINT "UQ_subject_reports_subject_user" UNIQUE (subject_id, user_id),
        CONSTRAINT "FK_subject_reports_subject_id" FOREIGN KEY (subject_id)
          REFERENCES subjects(id) ON DELETE CASCADE,
        CONSTRAINT "FK_subject_reports_user_id" FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_subject_reports_user_id" ON subject_reports (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_subjects_created_by" ON subjects (created_by)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subjects_created_by"`);
    await queryRunner.query(`DROP TABLE IF EXISTS subject_reports`);
  }
}
