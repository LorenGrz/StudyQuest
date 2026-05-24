import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('profile_borders')
export class ProfileBorder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 60 })
  @Index()
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'image_file', length: 255 })
  imageFile: string;

  @Column({ name: 'achievement_code', length: 60, unique: true })
  @Index()
  achievementCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
