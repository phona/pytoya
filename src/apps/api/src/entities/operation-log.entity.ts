import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ManifestEntity } from './manifest.entity';
import { UserEntity } from './user.entity';

export interface FieldDiff {
  path: string;
  before: unknown;
  after: unknown;
}

@Entity({ name: 'operation_logs' })
export class OperationLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'manifest_id' })
  manifestId!: number;

  @Index()
  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ type: 'jsonb' })
  diffs!: FieldDiff[];

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @ManyToOne(() => ManifestEntity, (manifest) => manifest.operationLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'manifest_id' })
  manifest!: ManifestEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
