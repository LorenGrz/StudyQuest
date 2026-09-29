import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DEFAULT_ELO } from '../../common/leagues';
import { Role } from '../../common/roles';
import { Subject } from '../subjects/subject.entity';
import { PartyMember } from '../parties/party-member.entity';
import { University } from '../universities/university.entity';
import { Career } from '../universities/career.entity';
import { CareerRequest } from '../universities/career-request.entity';

export interface AvailabilitySlot {
  day: number;
  hour: number;
}

export interface UserStats {
  xp: number;
  level: number;
  elo: number;
  quizzesPlayed: number;
  quizzesWon: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedAt: string | null;
  coins: number;
}

export interface ActiveCosmetics {
  titleCode: string | null;
  titleText: string | null;
  borderCode: string | null;
  borderImageUrl: string | null;
}

@Entity('users')
@Index(['career'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ unique: true, length: 30 })
  username: string;

  @Column({ name: 'display_name', length: 60 })
  displayName: string;

  @Column({
    name: 'avatar_url',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  bio: string | null;

  /**
   * Deprecated display copies of the catalog names, still written on every
   * register/profile change: the per-university ranking and the old frontend
   * read them. Source of truth is `universityId` / `careerId`. `career` is ''
   * while the user only has a pending career request.
   */
  @Column({ length: 200 })
  @Index('IDX_users_university')
  university: string;

  @Column({ length: 200 })
  career: string;

  @Column({ name: 'university_id', type: 'uuid', nullable: true, default: null })
  @Index('IDX_users_university_id')
  universityId: string | null;

  @ManyToOne(() => University, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'university_id',
    foreignKeyConstraintName: 'FK_users_university_id',
  })
  universityRef: University | null;

  @Column({ name: 'career_id', type: 'uuid', nullable: true, default: null })
  careerId: string | null;

  @ManyToOne(() => Career, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'career_id',
    foreignKeyConstraintName: 'FK_users_career_id',
  })
  careerRef: Career | null;

  /** Set while the user's "Otra" career waits for an admin. */
  @Column({
    name: 'pending_career_request_id',
    type: 'uuid',
    nullable: true,
    default: null,
  })
  pendingCareerRequestId: string | null;

  @ManyToOne(() => CareerRequest, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'pending_career_request_id',
    foreignKeyConstraintName: 'FK_users_pending_career_request_id',
  })
  pendingCareerRequest: CareerRequest | null;

  @Column({ type: 'smallint', default: 1 })
  year: number;

  @Column({ type: 'varchar', length: 10, default: Role.USER })
  role: Role;

  // ─── Subscription plan (manual tiers, no payment processor) ───────────────
  @Column({ name: 'plan', type: 'varchar', length: 16, default: 'free' })
  plan: string;

  @Column({
    name: 'plan_expires_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  planExpiresAt: Date | null;

  @Column({
    name: 'plan_source',
    type: 'varchar',
    length: 16,
    nullable: true,
    default: null,
  })
  planSource: string | null;

  @ManyToMany(() => Subject, (s) => s.enrolledUsers, { eager: false })
  @JoinTable({
    name: 'user_subjects',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'subject_id', referencedColumnName: 'id' },
  })
  enrolledSubjects: Subject[];

  @OneToMany(() => PartyMember, (pm) => pm.user)
  partyMemberships: PartyMember[];

  @Column({ type: 'jsonb', default: [] })
  availability: AvailabilitySlot[];

  @Column({
    type: 'jsonb',
    default: {
      xp: 0,
      level: 0,
      elo: DEFAULT_ELO,
      quizzesPlayed: 0,
      quizzesWon: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedAt: null,
      coins: 0,
    },
  })
  stats: UserStats;

  @Column({
    name: 'active_cosmetics',
    type: 'jsonb',
    default: {
      titleCode: null,
      titleText: null,
      borderCode: null,
      borderImageUrl: null,
    },
  })
  activeCosmetics: ActiveCosmetics;

  @Column({ name: 'refresh_tokens', type: 'jsonb', default: [], select: false })
  refreshTokens: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
