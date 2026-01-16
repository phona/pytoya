import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobEntity } from './job.entity';
import { ManifestEntity } from './manifest.entity';

@Entity({ name: 'extraction_history' })
export class ExtractionHistoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'manifest_id' })
  manifestId!: number;

  @Index()
  @Column({ name: 'job_id' })
  jobId!: number;

  @Column({ type: 'jsonb', name: 'extracted_data', nullable: true })
  extractedData!: Record<string, unknown> | null;

  @Column({ type: 'float', nullable: true })
  confidence!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  changes!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @ManyToOne(() => ManifestEntity, (manifest) => manifest.extractionHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'manifest_id' })
  manifest!: ManifestEntity;

  @ManyToOne(() => JobEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: JobEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
