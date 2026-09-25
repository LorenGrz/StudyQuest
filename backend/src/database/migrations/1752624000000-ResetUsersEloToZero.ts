import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reset every existing user's ELO to 0 so all users start the progression
 * ladder from Hierro (DEFAULT_ELO changed from 1200 → 0).
 *
 * down: no-op — restoring arbitrary ELO values is not meaningful; the
 * migration is effectively irreversible in production. If you need to roll
 * back the DEFAULT_ELO change itself, revert the leagues.ts constant; this
 * migration's down is intentionally a no-op.
 */
export class ResetUsersEloToZero1752624000000 implements MigrationInterface {
  name = 'ResetUsersEloToZero1752624000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE users SET stats = jsonb_set(stats, '{elo}', '0'::jsonb)`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op: ELO values before this migration are not recoverable.
    // To revert the DEFAULT_ELO constant change, update leagues.ts manually.
  }
}
