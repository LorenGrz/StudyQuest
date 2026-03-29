import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Party } from './party.entity';
import { User } from '../users/user.entity';

@Entity('party_members')
@Unique(['partyId', 'userId'])
@Index(['userId'])
export class PartyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'party_id' })
  partyId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Party, (p) => p.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party: Party;

  @ManyToOne(() => User, (u) => u.partyMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'party_xp', default: 0 })
  partyXp: number;

  @Column({ name: 'is_online', default: false })
  isOnline: boolean;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;
}
