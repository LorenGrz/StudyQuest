import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/** One row per (user, code). The unique constraint blocks double redemption. */
@Entity('promo_redemptions')
@Unique(['userId', 'code'])
export class PromoRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ length: 40 })
  code: string;

  @Column({ name: 'granted_days', type: 'int' })
  grantedDays: number;

  @CreateDateColumn({ name: 'redeemed_at', type: 'timestamptz' })
  redeemedAt: Date;
}
