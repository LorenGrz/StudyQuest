import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  BeforeInsert,
  BeforeUpdate,
  type IndexOptions,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Party } from '../parties/party.entity';
import { University } from '../universities/university.entity';
import { Career } from '../universities/career.entity';
import { normalizeSubjectName } from '../../common/subject-name';

export const SUBJECT_SOURCES = ['official', 'community', 'legacy'] as const;
export type SubjectSource = (typeof SUBJECT_SOURCES)[number];

export const SUBJECT_VISIBILITIES = ['private', 'university'] as const;
export type SubjectVisibility = (typeof SUBJECT_VISIBILITIES)[number];

export const SUBJECT_STATUSES = ['active', 'hidden', 'merged'] as const;
export type SubjectStatus = (typeof SUBJECT_STATUSES)[number];

// TypeORM honours `synchronize: false` on @Index at runtime but its
// IndexOptions type doesn't declare it.
const MIGRATION_ONLY = { synchronize: false } as IndexOptions;

/**
 * The two name indexes are created by the migrations only
 * (CommunitySubjectsBackfill): TypeORM can't express a partial unique index
 * portably nor a GIN trigram opclass, so `synchronize: false` keeps sync from
 * dropping or re-creating them.
 */
@Entity('subjects')
@Unique(['code', 'university'])
@Index(['career', 'year'])
@Index(
  'UQ_subjects_university_name_normalized',
  ['universityId', 'nameNormalized'],
  { unique: true, where: `"status" <> 'merged'`, ...MIGRATION_ONLY },
)
@Index('IDX_subjects_name_normalized_trgm', ['nameNormalized'], MIGRATION_ONLY)
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  /** Legacy/official subjects have one; community subjects don't. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  code: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ length: 200 })
  university: string;

  @Column({ length: 200 })
  career: string;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ name: 'enrolled_count', default: 0 })
  enrolledCount: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    name: 'university_id',
    type: 'uuid',
    nullable: true,
    default: null,
  })
  universityId: string | null;

  @ManyToOne(() => University, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'university_id',
    foreignKeyConstraintName: 'FK_subjects_university_id',
  })
  universityRef: University | null;

  /**
   * Hint only, not ownership: there is ONE subject per (university,
   * normalized name), shared by every career that takes it, and the explorer
   * filters by university. No subject↔career join table by design.
   */
  @Column({ name: 'career_id', type: 'uuid', nullable: true, default: null })
  careerId: string | null;

  @ManyToOne(() => Career, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'career_id',
    foreignKeyConstraintName: 'FK_subjects_career_id',
  })
  careerRef: Career | null;

  /** normalizeSubjectName(name); dedup key within a university. */
  @Column({ name: 'name_normalized', type: 'varchar', length: 255 })
  nameNormalized: string;

  /** DB default is the safe one; legacy/official writers set it explicitly. */
  @Column({ type: 'varchar', length: 16, default: 'community' })
  source: SubjectSource;

  @Column({ name: 'created_by', type: 'uuid', nullable: true, default: null })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_subjects_created_by',
  })
  creator: User | null;

  @Column({ type: 'varchar', length: 16, default: 'private' })
  visibility: SubjectVisibility;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: SubjectStatus;

  @Column({
    name: 'merged_into_id',
    type: 'uuid',
    nullable: true,
    default: null,
  })
  mergedIntoId: string | null;

  @ManyToOne(() => Subject, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'merged_into_id',
    foreignKeyConstraintName: 'FK_subjects_merged_into_id',
  })
  mergedInto: Subject | null;

  /**
   * Result of the name validation layers (R2), kept for auditing. Not
   * selected by default so public subject endpoints never leak it.
   */
  @Column({ type: 'jsonb', nullable: true, default: null, select: false })
  moderation: Record<string, unknown> | null;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @ManyToMany(() => User, (u) => u.enrolledSubjects)
  enrolledUsers: User[];

  @OneToMany(() => Party, (p) => p.subject)
  parties: Party[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Fills the dedup key on repository saves (seed, admin POST /subjects).
  // Only when missing: the backfill may have stored a disambiguated key
  // ("<normalized> ~<code>"), so renames (R2/W3) must set it explicitly.
  @BeforeInsert()
  @BeforeUpdate()
  normalizeName() {
    if (this.name && !this.nameNormalized)
      this.nameNormalized = normalizeSubjectName(this.name);
  }
}
