import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Party } from './party.entity';
import { User } from '../users/user.entity';

export type PartyInvitationStatus = 'pending' | 'accepted' | 'rejected';

@Entity('party_invitations')
@Unique(['partyId', 'inviteeId'])
@Index(['partyId'])
@Index(['inviteeId'])
export class PartyInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'party_id' })
  partyId: string;

  @Column({ name: 'inviter_id' })
  inviterId: string;

  @Column({ name: 'invitee_id' })
  inviteeId: string;

  @ManyToOne(() => Party, (party) => party.invitations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party: Party;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inviter_id' })
  inviter: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitee_id' })
  invitee: User;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  })
  status: PartyInvitationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true, default: null })
  respondedAt: Date | null;
}
