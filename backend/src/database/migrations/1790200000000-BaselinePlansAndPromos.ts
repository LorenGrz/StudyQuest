import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline for the billing schema that so far only existed via
 * TYPEORM_SYNC=true: users.plan / plan_expires_at / plan_source and the
 * promo_codes / promo_redemptions tables. Every statement is IF NOT EXISTS
 * (constraint and index names match what `synchronize` generates), so on a
 * DB that already has them — prod — this is a no-op; on a DB synced before
 * billing existed it adds them.
 *
 * down: intentional no-op — dropping these would delete plans and promo
 * history that predate this migration.
 */
export class BaselinePlansAndPromos1790200000000 implements MigrationInterface {
  name = 'BaselinePlansAndPromos1790200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS plan character varying(16) NOT NULL DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS plan_expires_at timestamp with time zone,
        ADD COLUMN IF NOT EXISTS plan_source character varying(16)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        code character varying(40) NOT NULL,
        plan character varying(16) NOT NULL DEFAULT 'pro',
        duration_days integer NOT NULL,
        max_redemptions integer NOT NULL DEFAULT 1,
        redeemed_count integer NOT NULL DEFAULT 0,
        expires_at timestamp with time zone,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_2f096c406a9d9d5b8ce204190c3" PRIMARY KEY (code)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promo_redemptions (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        user_id character varying NOT NULL,
        code character varying(40) NOT NULL,
        granted_days integer NOT NULL,
        redeemed_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_34a930e5657a7e0a837b0bb41c9" PRIMARY KEY (id),
        CONSTRAINT "UQ_b1d3dfbf9c55a03d923e6ed81c5" UNIQUE (user_id, code)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_8fd9caec505c3d0e23664b7920" ON promo_redemptions (user_id)`,
    );
  }

  async down(): Promise<void> {
    // Intentional no-op (see class comment).
  }
}
