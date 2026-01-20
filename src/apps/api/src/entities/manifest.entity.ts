import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExtractionHistoryEntity } from './extraction-history.entity';
import { GroupEntity } from './group.entity';
import { JobEntity } from './job.entity';
import { ManifestItemEntity } from './manifest-item.entity';
import { ExtractorEntity } from './extractor.entity';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'warning' | 'error';
  actual?: any;
  expected?: any;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  validatedAt: string;
}

export enum ManifestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum FileType {
  PDF = 'pdf',
  IMAGE = 'image',
}

@Entity({ name: 'manifests' })
export class ManifestEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  filename!: string;

  @Column({ type: 'varchar', name: 'original_filename' })
  originalFilename!: string;

  @Column({ type: 'varchar', name: 'storage_path' })
  storagePath!: string;

  @Column({ type: 'int', name: 'file_size' })
  fileSize!: number;

  @Index()
  @Column({ type: 'enum', enum: FileType, default: FileType.PDF })
  fileType!: FileType;

  @Index()
  @Column({ type: 'enum', enum: ManifestStatus, default: ManifestStatus.PENDING })
  status!: ManifestStatus;

  @Index()
  @Column({ type: 'int', name: 'group_id' })
  groupId!: number;

  @Column({ type: 'jsonb', name: 'extracted_data', nullable: true })
  extractedData!: Record<string, unknown> | null;

  @Column({ type: 'float', nullable: true })
  confidence!: number | null;

  @Index()
  @Column({ type: 'varchar', name: 'purchase_order', nullable: true })
  purchaseOrder!: string | null;

  @Column({ type: 'date', name: 'invoice_date', nullable: true })
  invoiceDate!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  department!: string | null;

  @Column({ type: 'boolean', name: 'human_verified', default: false })
  humanVerified!: boolean;

  @Column({ type: 'jsonb', name: 'validation_results', nullable: true })
  validationResults!: ValidationResult | null;

  @Column({ type: 'jsonb', name: 'ocr_result', nullable: true })
  ocrResult!: Record<string, unknown> | null;

  @Column({ type: 'timestamp', name: 'ocr_processed_at', nullable: true })
  ocrProcessedAt!: Date | null;

  @Column({ type: 'integer', name: 'ocr_quality_score', nullable: true })
  ocrQualityScore!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    name: 'extraction_cost',
    nullable: true,
  })
  extractionCost!: number | null;

  @Column({ type: 'uuid', nullable: true, name: 'text_extractor_id' })
  textExtractorId!: string | null;

  @ManyToOne(() => GroupEntity, (group) => group.manifests)
  @JoinColumn({ name: 'group_id' })
  group!: GroupEntity;

  @OneToMany(() => JobEntity, (job) => job.manifest)
  jobs!: JobEntity[];

  @ManyToOne(() => ExtractorEntity, { nullable: true })
  @JoinColumn({ name: 'text_extractor_id' })
  textExtractor!: ExtractorEntity | null;

  @OneToMany(() => ManifestItemEntity, (item) => item.manifest)
  manifestItems!: ManifestItemEntity[];

  @OneToMany(
    () => ExtractionHistoryEntity,
    (history) => history.manifest,
  )
  extractionHistory!: ExtractionHistoryEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
