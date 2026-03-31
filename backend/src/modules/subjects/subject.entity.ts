import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Party } from '../parties/party.entity';

@Entity('subjects')
@Unique(['code', 'university'])
@Index(['university', 'career', 'semester'])
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20 })
  code: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ length: 200 })
  university: string;

  @Column({ length: 200 })
  career: string;

  @Column({ type: 'smallint' })
  semester: number;

  @Column({ name: 'enrolled_count', default: 0 })
  enrolledCount: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @ManyToMany(() => User, (u) => u.enrolledSubjects)
  enrolledUsers: User[];

  @OneToMany(() => Party, (p) => p.subject)
  parties: Party[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
