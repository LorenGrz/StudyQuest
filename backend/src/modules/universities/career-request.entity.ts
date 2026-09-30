import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { University } from './university.entity';
import { Career } from './career.entity';

export const CAREER_REQUEST_STATUSES = [
  'pending',
  'approved',
  'rejected',
] as const;
export type CareerRequestStatus = (typeof CAREER_REQUEST_STATUSES)[number];

/**
 * "Mi carrera no está en la lista": stays `pending` until an admin approves it
 * (creating or linking `careerId`) or rejects it with `adminNote`.
 */
@Entity('career_requests')
@Index('IDX_career_requests_status', ['status'])
export class CareerRequest {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_career_requests',
  })
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('IDX_career_requests_user_id')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_career_requests_user_id',
  })
  user: User | null;

  @Column({ name: 'university_id', type: 'uuid' })
  universityId: string;

  @ManyToOne(() => University, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'university_id',
    foreignKeyConstraintName: 'FK_career_requests_university_id',
  })
  university: University | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: CareerRequestStatus;

  @Column({ name: 'career_id', type: 'uuid', nullable: true, default: null })
  careerId: string | null;

  @ManyToOne(() => Career, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'career_id',
    foreignKeyConstraintName: 'FK_career_requests_career_id',
  })
  career: Career | null;

  @Column({
    name: 'admin_note',
    type: 'varchar',
    length: 500,
    nullable: true,
    default: null,
  })
  adminNote: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({
    name: 'resolved_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  resolvedAt: Date | null;
}
