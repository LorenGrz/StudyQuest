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
import { User } from '../users/user.entity';
import { SkillNode } from './skill-node.entity';

@Entity('user_skill_progress')
@Unique(['userId', 'skillNodeId'])
@Index(['userId', 'skillNodeId'])
export class UserSkillProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'skill_node_id' })
  skillNodeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => SkillNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_node_id' })
  skillNode: SkillNode;

  @Column({ name: 'topic_xp', default: 0 })
  topicXp: number;

  @Column({ default: false })
  unlocked: boolean;

  @Column({ name: 'unlocked_at', type: 'timestamptz', nullable: true, default: null })
  unlockedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
