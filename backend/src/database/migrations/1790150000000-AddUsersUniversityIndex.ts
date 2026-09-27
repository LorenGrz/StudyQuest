import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The "por universidad" leaderboard filters (and the universities picker)
 * scan `users.university`. Index it so that filter doesn't force a
 * sequential scan as the table grows. Name matches the `@Index('IDX_users_university')`
 * decorator on `User.university` so a synced dev DB doesn't create a second,
 * differently-named index for the same column.
 */
export class AddUsersUniversityIndex1790150000000
  implements MigrationInterface
{
  name = 'AddUsersUniversityIndex1790150000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_university" ON "users" ("university")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_university"`);
  }
}
