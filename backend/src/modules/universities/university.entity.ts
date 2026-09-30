import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

/**
 * Official university catalog (curated in the repo, applied by
 * `careers:sync`). Constraint names are explicit so the migration
 * (CommunitySubjectsSchema) and `synchronize` agree on the schema.
 */
@Entity('universities')
@Unique('UQ_universities_name', ['name'])
export class University {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_universities',
  })
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({
    name: 'short_name',
    type: 'varchar',
    length: 40,
    nullable: true,
    default: null,
  })
  shortName: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true, default: null })
  website: string | null;

  @Column({ name: 'careers_source_urls', type: 'jsonb', default: [] })
  careersSourceUrls: string[];

  @Column({
    name: 'last_synced_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
