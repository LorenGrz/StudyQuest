import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  @Index()
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 10 })
  icon: string;

  @Column({ length: 30 })
  category: string;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({
    name: 'reward_type',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: null,
  })
  rewardType: 'title' | 'border' | null;

  @Column({
    name: 'reward_code',
    type: 'varchar',
    length: 60,
    nullable: true,
    default: null,
  })
  rewardCode: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
