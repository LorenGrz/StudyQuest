import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
} from 'typeorm';
import { Subject } from '../subjects/subject.entity';
import { PartyMember } from '../parties/party-member.entity';

export interface AvailabilitySlot {
  day: number;
  hour: number;
}

export interface UserStats {
  xp: number;
  level: number;
  quizzesPlayed: number;
  quizzesWon: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedAt: string | null;
}

@Entity('users')
@Index(['university', 'career'])
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

  @Column({ length: 200 })
  university: string;

  @Column({ length: 200 })
  career: string;

  @Column({ type: 'smallint', default: 1 })
  semester: number;

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
      quizzesPlayed: 0,
      quizzesWon: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedAt: null,
    },
  })
  stats: UserStats;

  @Column({ name: 'refresh_tokens', type: 'jsonb', default: [], select: false })
  refreshTokens: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
