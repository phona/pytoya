import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ModelPricing, ModelPricingHistoryEntry } from './model-pricing.types';

@Entity({ name: 'models' })
export class ModelEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  name!: string;

  @Index()
  @Column({ type: 'varchar', name: 'adapter_type' })
  adapterType!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  parameters!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  pricing!: ModelPricing;

  @Column({
    type: 'jsonb',
    name: 'pricing_history',
    default: () => "'[]'::jsonb",
  })
  pricingHistory!: ModelPricingHistoryEntry[];

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Index()
  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
