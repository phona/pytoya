import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ManifestEntity } from './manifest.entity';

@Entity()
export class ManifestItemEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', name: 'unit_price' })
  unitPrice!: number;

  @Column({ type: 'decimal', name: 'total_price' })
  totalPrice!: number;

  @Column({ type: 'int', name: 'manifest_id' })
  manifestId!: number;

  @ManyToOne(() => ManifestEntity, (manifest) => manifest.manifestItems)
  @JoinColumn({ name: 'manifest_id' })
  manifest!: ManifestEntity;
}
