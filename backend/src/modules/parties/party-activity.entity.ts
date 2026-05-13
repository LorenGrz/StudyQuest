import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Party } from './party.entity';
import { User } from '../users/user.entity';

export type ActivityType =
  | 'member_joined'      // Un miembro se unió
  | 'member_left'        // Un miembro se fue
  | 'member_removed'     // Un miembro fue removido por líder
  | 'quest_created'      // Se subió una nota (se generó quest)
  | 'quest_started'      // Alguien empezó un quest
  | 'quest_completed'    // Un quest fue completado
  | 'party_status_changed'  // La party cambió de estado
  | 'party_visibility_changed'  // La party cambió de visibilidad
  | 'member_promoted';   // Un miembro fue promovido a líder

@Entity('party_activities')
@Index(['partyId', 'createdAt'])
@Index(['userId'])
export class PartyActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'party_id' })
  partyId: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({
    type: 'enum',
    enum: [
      'member_joined',
      'member_left',
      'member_removed',
      'quest_created',
      'quest_started',
      'quest_completed',
      'party_status_changed',
      'party_visibility_changed',
      'member_promoted',
    ],
  })
  type: ActivityType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    questId?: string;
    questTitle?: string;
    targetUserId?: string;
    targetUserName?: string;
    oldStatus?: string;
    newStatus?: string;
    oldVisibility?: boolean;
    newVisibility?: boolean;
  };

  @ManyToOne(() => Party, (p) => p.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party: Party;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
