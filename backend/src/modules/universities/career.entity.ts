import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { University } from './university.entity';
import { normalizeSubjectName } from '../../common/subject-name';

export const CAREER_LEVELS = ['grado', 'pregrado'] as const;
export type CareerLevel = (typeof CAREER_LEVELS)[number];

export const CAREER_STATUSES = ['active', 'retired'] as const;
export type CareerStatus = (typeof CAREER_STATUSES)[number];

/**
 * Official career of a university. Careers that disappear from the source
 * are `retired`, never deleted (users and subjects reference them).
 */
@Entity('careers')
@Unique('UQ_careers_university_name_normalized', [
  'universityId',
  'nameNormalized',
])
export class Career {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_careers' })
  id: string;

  @Column({ name: 'university_id', type: 'uuid' })
  universityId: string;

  @ManyToOne(() => University, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'university_id',
    foreignKeyConstraintName: 'FK_careers_university_id',
  })
  university: University | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'name_normalized', type: 'varchar', length: 200 })
  nameNormalized: string;

  @Column({ type: 'varchar', length: 200, nullable: true, default: null })
  faculty: string | null;

  @Column({ type: 'varchar', length: 16, default: 'grado' })
  level: CareerLevel;

  @Column({
    name: 'source_url',
    type: 'varchar',
    length: 500,
    nullable: true,
    default: null,
  })
  sourceUrl: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: CareerStatus;

  @Column({
    name: 'verified_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeName() {
    if (this.name) this.nameNormalized = normalizeSubjectName(this.name);
  }
}
