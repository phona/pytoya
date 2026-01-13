import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LlmProviderType {
  PADDLEX = 'paddlex',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

@Entity()
export class LlmProviderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'enum', enum: LlmProviderType })
  type!: LlmProviderType;

  @Column({ type: 'varchar' })
  api_key!: string;

  @Column({ type: 'varchar', nullable: true })
  base_url!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  config!: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
