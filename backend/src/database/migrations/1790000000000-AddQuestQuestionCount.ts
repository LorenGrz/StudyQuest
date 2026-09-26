import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Quiz content moves to DynamoDB; Postgres keeps a denormalised question
 * count on the quest so list views don't need to read DynamoDB.
 *
 * Backfill is done by `pnpm run migrate:quizzes-dynamo`, which copies
 * quiz_questions/quiz_options into DynamoDB and sets `question_count`.
 * The quiz_questions / quiz_options tables are intentionally NOT dropped here.
 */
export class AddQuestQuestionCount1790000000000 implements MigrationInterface {
  name = 'AddQuestQuestionCount1790000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE quests ADD COLUMN IF NOT EXISTS question_count int NOT NULL DEFAULT 0`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE quests DROP COLUMN IF EXISTS question_count`,
    );
  }
}
