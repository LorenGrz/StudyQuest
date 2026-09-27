import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  type ValueTransformer,
} from 'typeorm';
import { User } from '../../users/user.entity';

/** Statuses Mercado Pago reports for a payment, plus our initial `pending`. */
export const PAYMENT_STATUSES = [
  'pending',
  'approved',
  'authorized',
  'in_process',
  'in_mediation',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Final for an MP payment: never moved back to approved/in_process. */
export const TERMINAL_STATUSES: readonly PaymentStatus[] = [
  'refunded',
  'charged_back',
];

/** pg returns `numeric` as a string; amounts here are small, so a JS number is exact enough. */
const numeric: ValueTransformer = {
  to: (v: number | null | undefined) => v,
  from: (v: string | null) => (v === null || v === undefined ? v : Number(v)),
};

/**
 * One Checkout Pro attempt: created `pending` when the user starts a checkout,
 * updated from the Mercado Pago API (webhook or reconciliation). `appliedAt`
 * is when Pro was first granted for it; the per-MP-payment ledger that makes
 * grants idempotent is PaymentGrant.
 *
 * Constraint/index names are explicit so the migration (AddPayments) and
 * `synchronize` agree on the schema.
 */
@Entity('payments')
@Unique('UQ_payments_mp_payment_id', ['mpPaymentId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_payments' })
  id: string;

  /** Nullable so deleting a user keeps the accounting record. */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index('IDX_payments_user_id')
  userId: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_payments_user_id',
  })
  user?: User | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: PaymentStatus;

  @Column({
    name: 'amount_ars',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numeric,
  })
  amountArs: number;

  @Column({
    name: 'usd_amount',
    type: 'numeric',
    precision: 8,
    scale: 2,
    transformer: numeric,
  })
  usdAmount: number;

  @Column({
    name: 'fx_rate',
    type: 'numeric',
    precision: 12,
    scale: 4,
    transformer: numeric,
  })
  fxRate: number;

  @Column({ type: 'int' })
  days: number;

  @Column({
    name: 'mp_preference_id',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  mpPreferenceId: string | null;

  @Column({
    name: 'mp_payment_id',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  mpPaymentId: string | null;

  @Column({
    name: 'applied_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  appliedAt: Date | null;

  @Column({
    name: 'raw_status_detail',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  rawStatusDetail: string | null;

  /** Checkout URL of the preference, reused while it is still fresh (see createCheckout). */
  @Column({ name: 'init_point', type: 'varchar', nullable: true, default: null })
  initPoint: string | null;

  /**
   * Set when an approved MP payment could not be granted automatically
   * (amount/currency mismatch, test payment in live mode, missing user) and
   * needs a human. Stops reconciliation and tells the UI to show support.
   */
  @Column({
    name: 'needs_review_reason',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  needsReviewReason: string | null;

  /** Last time we asked the MP API about this payment (reconciliation throttle). */
  @Column({
    name: 'last_synced_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
