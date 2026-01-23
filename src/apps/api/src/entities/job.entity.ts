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

  @Column({ type: 'varchar', name: 'field_name', nullable: true })
  fieldName!: string | null;

  @Column({ type: 'varchar', name: 'queue_job_id', nullable: true })
  queueJobId!: string | null;

  @Column({ type: 'float', default: 0 })
  progress!: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 9,
    name: 'estimated_cost',
    nullable: true,
  })
  estimatedCost!: number | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 9,
    name: 'actual_cost',
    nullable: true,
  })
  actualCost!: number | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 9,
    name: 'ocr_estimated_cost',
    nullable: true,
  })
  ocrEstimatedCost!: number | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 9,
    name: 'ocr_actual_cost',
    nullable: true,
  })
  ocrActualCost!: number | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 9,
    name: 'llm_estimated_cost',
    nullable: true,
  })
  llmEstimatedCost!: number | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 9,
    name: 'llm_actual_cost',
    nullable: true,
  })
  llmActualCost!: number | null;

  @Column({ type: 'varchar', name: 'cost_currency', nullable: true })
  costCurrency!: string | null;

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

  @Column({ type: 'timestamp', name: 'cancel_requested_at', nullable: true })
  cancelRequestedAt!: Date | null;

  @Column({ type: 'text', name: 'cancel_reason', nullable: true })
  cancelReason!: string | null;

  @Column({ type: 'timestamp', name: 'canceled_at', nullable: true })
  canceledAt!: Date | null;

  @Column({ type: 'text', name: 'system_prompt', nullable: true })
  systemPrompt!: string | null;

  @Column({ type: 'text', name: 'user_prompt', nullable: true })
  userPrompt!: string | null;

  @Column({ type: 'text', name: 'assistant_response', nullable: true })
  assistantResponse!: string | null;

  @ManyToOne(() => ManifestEntity, (manifest) => manifest.jobs)
  @JoinColumn({ name: 'manifest_id' })
  manifest!: ManifestEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
