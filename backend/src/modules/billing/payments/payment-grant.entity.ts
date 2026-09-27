import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Payment } from './payment.entity';

/**
 * Ledger of Pro days granted per *Mercado Pago payment*. One preference
 * (Payment row) can be paid more than once; each distinct approved MP payment
 * grants its days exactly once — the UNIQUE mp_payment_id is the idempotency
 * guard. `revokedAt` is set when that MP payment is refunded / charged back
 * and its days are taken back.
 */
@Entity('payment_grants')
@Unique('UQ_payment_grants_mp_payment_id', ['mpPaymentId'])
export class PaymentGrant {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_payment_grants',
  })
  id: string;

  @Column({ name: 'mp_payment_id', type: 'varchar' })
  mpPaymentId: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  @Index('IDX_payment_grants_payment_id')
  paymentId: string;

  @ManyToOne(() => Payment, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'payment_id',
    foreignKeyConstraintName: 'FK_payment_grants_payment_id',
  })
  payment?: Payment;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index('IDX_payment_grants_user_id')
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_payment_grants_user_id',
  })
  user?: User | null;

  @Column({ type: 'int' })
  days: number;

  @CreateDateColumn({ name: 'granted_at', type: 'timestamptz' })
  grantedAt: Date;

  @Column({
    name: 'revoked_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  revokedAt: Date | null;
}
