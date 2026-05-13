import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Subject } from '../subjects/subject.entity';
import { PartyMember } from './party-member.entity';
import { ChatMessage } from './chat-message.entity';
import { Quest } from '../quests/quest.entity';

export type PartyStatus = 'forming' | 'active' | 'closed';
export type PartyType = 'quiz' | 'study';

@Entity('parties')
export class Party {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_id' })
  @Index()
  subjectId: string;

  @ManyToOne(() => Subject, (s) => s.parties, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({
    type: 'enum',
    enum: ['forming', 'active', 'closed'],
    default: 'forming',
  })
  @Index()
  status: PartyStatus;

  @Column({
    type: 'enum',
    enum: ['quiz', 'study'],
    default: 'quiz',
  })
  @Index()
  type: PartyType;

  @Column({ name: 'max_members', type: 'smallint', default: 4 })
  maxMembers: number;

  @Column({ name: 'is_private', default: false })
  isPrivate: boolean;

  @OneToMany(() => PartyMember, (pm) => pm.party, { cascade: true })
  members: PartyMember[];

  @OneToMany(() => ChatMessage, (cm) => cm.party, { cascade: true })
  chatMessages: ChatMessage[];

  @OneToMany(() => Quest, (q) => q.party)
  quests: Quest[];

  @Column({
    name: 'closed_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  closedAt: Date | null;

  @Column({ name: 'invite_token', type: 'varchar', nullable: true, default: null })
  inviteToken: string | null;

  @Column({ name: 'invite_expires_at', type: 'timestamptz', nullable: true, default: null })
  inviteExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
