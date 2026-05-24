import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_titles')
export class UserTitle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 60 })
  @Index()
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 80 })
  text: string;

  @Column({ name: 'achievement_code', length: 60, unique: true })
  @Index()
  achievementCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
