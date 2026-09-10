import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A code a user can redeem for a temporary plan upgrade. Minted by an admin or
 * seeded. No payment involved.
 */
@Entity('promo_codes')
export class PromoCode {
  /** Stored uppercased. */
  @PrimaryColumn({ length: 40 })
  code: string;

  @Column({ type: 'varchar', length: 16, default: 'pro' })
  plan: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number;

  @Column({ name: 'max_redemptions', type: 'int', default: 1 })
  maxRedemptions: number;

  @Column({ name: 'redeemed_count', type: 'int', default: 0 })
  redeemedCount: number;

  @Column({
    name: 'expires_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  expiresAt: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
