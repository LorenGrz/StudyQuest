import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mercado Pago Checkout Pro payments (modules/billing/payments/payment.entity.ts).
 * IF NOT EXISTS so a dev DB that already got the table from synchronize is
 * left alone; names match the entity's explicit constraint names.
 *
 * down: intentional no-op — `payments` holds financial records (what was
 * charged, to whom, and whether Pro was granted). A code rollback leaves the
 * table unused, which is harmless; never drop it without exporting it first.
 */
export class AddPayments1790300000000 implements MigrationInterface {
  name = 'AddPayments1790300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        user_id uuid,
        status character varying(20) NOT NULL DEFAULT 'pending',
        amount_ars numeric(12,2) NOT NULL,
        usd_amount numeric(8,2) NOT NULL,
        fx_rate numeric(12,4) NOT NULL,
        days integer NOT NULL,
        mp_preference_id character varying,
        mp_payment_id character varying,
        applied_at timestamp with time zone,
        raw_status_detail character varying,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY (id),
        CONSTRAINT "UQ_payments_mp_payment_id" UNIQUE (mp_payment_id),
        CONSTRAINT "FK_payments_user_id" FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_user_id" ON payments (user_id)`,
    );
  }

  async down(): Promise<void> {
    // Intentional no-op (see class comment).
  }
}
