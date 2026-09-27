import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-MP-payment grant ledger (payment_grants) and the reconciliation /
 * review columns on payments. Additive and IF NOT EXISTS; names match the
 * entities (payment-grant.entity.ts, payment.entity.ts).
 *
 * down: intentional no-op — these are financial records (which MP payment
 * granted which days, which ones need review). Rolling the code back leaves
 * the extra table/columns unused, which is harmless; drop them by hand only
 * after exporting them.
 */
export class PaymentGrantsAndReview1790400000000 implements MigrationInterface {
  name = 'PaymentGrantsAndReview1790400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS init_point character varying,
        ADD COLUMN IF NOT EXISTS needs_review_reason character varying,
        ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_grants (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        mp_payment_id character varying NOT NULL,
        payment_id uuid NOT NULL,
        user_id uuid,
        days integer NOT NULL,
        granted_at timestamp with time zone NOT NULL DEFAULT now(),
        revoked_at timestamp with time zone,
        CONSTRAINT "PK_payment_grants" PRIMARY KEY (id),
        CONSTRAINT "UQ_payment_grants_mp_payment_id" UNIQUE (mp_payment_id),
        CONSTRAINT "FK_payment_grants_payment_id" FOREIGN KEY (payment_id)
          REFERENCES payments(id) ON DELETE NO ACTION,
        CONSTRAINT "FK_payment_grants_user_id" FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_grants_payment_id" ON payment_grants (payment_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_grants_user_id" ON payment_grants (user_id)`,
    );
  }

  async down(): Promise<void> {
    // Intentional no-op (see class comment).
  }
}
