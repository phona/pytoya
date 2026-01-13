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

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'processing',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity()
export class JobEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'int', name: 'manifest_id' })
  manifestId!: number;

  @Index()
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.PENDING })
  status!: JobStatus;

  @Column({ type: 'int', name: 'provider_id', nullable: true })
  providerId!: number | null;

  @Column({ type: 'int', name: 'prompt_id', nullable: true })
  promptId!: number | null;

  @Column({ type: 'varchar', name: 'queue_job_id', nullable: true })
  queueJobId!: string | null;

  @Column({ type: 'float', default: 0 })
  progress!: number;

  @Column({ type: 'int', name: 'attempt_count', default: 0 })
  attemptCount!: number;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  error!: string | null;

  @Column({ type: 'timestamp', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @ManyToOne(() => ManifestEntity, (manifest) => manifest.jobs)
  @JoinColumn({ name: 'manifest_id' })
  manifest!: ManifestEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
