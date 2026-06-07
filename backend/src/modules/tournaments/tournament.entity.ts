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
import { Quest } from '../quests/quest.entity';
import { Party } from '../parties/party.entity';
import { TournamentParticipant } from './tournament-participant.entity';

export type TournamentStatus = 'pending' | 'active' | 'finished';

@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ name: 'quest_id' })
  @Index()
  questId: string;

  @Column({ name: 'creator_party_id' })
  @Index()
  creatorPartyId: string;

  @ManyToOne(() => Quest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quest_id' })
  quest: Quest;

  @ManyToOne(() => Party, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_party_id' })
  creatorParty: Party;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'finished'],
    default: 'pending',
  })
  @Index()
  status: TournamentStatus;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @OneToMany(() => TournamentParticipant, (tp) => tp.tournament, { cascade: true })
  participants: TournamentParticipant[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
