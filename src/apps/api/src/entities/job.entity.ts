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

@Entity({ name: 'jobs' })
export class JobEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'int', name: 'manifest_id' })
  manifestId!: number;

  @Index()
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.PENDING })
  status!: JobStatus;

  @Column({ type: 'uuid', name: 'llm_model_id', nullable: true })
  llmModelId!: string | null;

  @Column({ type: 'int', name: 'prompt_id', nullable: true })
  promptId!: number | null;

  @Column({ type: 'varchar', name: 'queue_job_id', nullable: true })
  queueJobId!: string | null;

  @Column({ type: 'float', default: 0 })
  progress!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    name: 'estimated_cost',
    nullable: true,
  })
  estimatedCost!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    name: 'actual_cost',
    nullable: true,
  })
  actualCost!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    name: 'ocr_estimated_cost',
    nullable: true,
  })
  ocrEstimatedCost!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    name: 'ocr_actual_cost',
    nullable: true,
  })
  ocrActualCost!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    name: 'llm_estimated_cost',
    nullable: true,
  })
  llmEstimatedCost!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    name: 'llm_actual_cost',
    nullable: true,
  })
  llmActualCost!: number | null;

  @Column({ type: 'int', name: 'llm_input_tokens', nullable: true })
  llmInputTokens!: number | null;

  @Column({ type: 'int', name: 'llm_output_tokens', nullable: true })
  llmOutputTokens!: number | null;

  @Column({ type: 'int', name: 'pages_processed', nullable: true })
  pagesProcessed!: number | null;

  @Column({ type: 'varchar', name: 'model_id', nullable: true })
  modelId!: string | null;

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
