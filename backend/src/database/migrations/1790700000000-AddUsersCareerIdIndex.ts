import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The "por carrera" leaderboard filters `users.career_id`. Index it so that
 * filter doesn't force a sequential scan as the table grows. Name matches
 * the `@Index('IDX_users_career_id')` decorator on `User.careerId` so a
 * synced dev DB doesn't create a second, differently-named index for the
 * same column.
 */
export class AddUsersCareerIdIndex1790700000000 implements MigrationInterface {
  name = 'AddUsersCareerIdIndex1790700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_career_id" ON "users" ("career_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_career_id"`);
  }
}
