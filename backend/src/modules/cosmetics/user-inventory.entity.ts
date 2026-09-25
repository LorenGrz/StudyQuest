import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';

export type InventoryItemType = 'border' | 'title';

@Entity('user_inventory')
@Unique(['userId', 'itemType', 'itemCode'])
@Index(['userId'])
export class UserInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'item_type', type: 'varchar', length: 20 })
  itemType: InventoryItemType;

  @Column({ name: 'item_code', type: 'varchar', length: 60 })
  itemCode: string;

  @CreateDateColumn({ name: 'unlocked_at' })
  unlockedAt: Date;
}
