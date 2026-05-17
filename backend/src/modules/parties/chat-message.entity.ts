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

@Entity('chat_messages')
@Index(['partyId', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'party_id' })
  partyId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Party, (p) => p.chatMessages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party: Party;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 16, default: 'text' })
  type: 'text' | 'file' | 'audio';

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl: string | null;

  @Column({ name: 'attachment_name', type: 'text', nullable: true })
  attachmentName: string | null;

  @Column({ name: 'attachment_mime_type', type: 'text', nullable: true })
  attachmentMimeType: string | null;

  @Column({ name: 'attachment_size_bytes', type: 'int', nullable: true })
  attachmentSizeBytes: number | null;

  @Column({ name: 'attachment_duration_ms', type: 'int', nullable: true })
  attachmentDurationMs: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
