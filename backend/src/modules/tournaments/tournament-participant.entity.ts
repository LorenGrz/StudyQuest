import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Tournament } from './tournament.entity';
import { Party } from '../parties/party.entity';

@Entity('tournament_participants')
@Unique(['tournamentId', 'partyId'])
export class TournamentParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournament_id' })
  @Index()
  tournamentId: string;

  @Column({ name: 'party_id' })
  @Index()
  partyId: string;

  @ManyToOne(() => Tournament, (t) => t.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @ManyToOne(() => Party, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party: Party;

  @Column({ default: 0 })
  score: number;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;
}
