import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Usernames are now stored lowercase (see common/username.ts). Lowercases the
 * existing ones, skipping any row whose lowercase form is already taken so the
 * unique index can't fail; those need a manual rename.
 *
 * down: no-op — the original casing is not recoverable.
 */
export class LowercaseUsernames1790100000000 implements MigrationInterface {
  name = 'LowercaseUsernames1790100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE users u
      SET username = lower(u.username)
      WHERE u.username <> lower(u.username)
        AND NOT EXISTS (
          SELECT 1 FROM users o
          WHERE o.id <> u.id AND lower(o.username) = lower(u.username)
        )
    `);
  }

  async down(): Promise<void> {
    // Intentional no-op.
  }
}
