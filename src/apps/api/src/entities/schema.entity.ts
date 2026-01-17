import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { ExtractionStrategy } from '../extraction/extraction.types';

@Entity('schemas')
export class SchemaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'jsonb', name: 'json_schema' })
  jsonSchema!: Record<string, unknown>;

  @Column({ type: 'simple-array', nullable: true, name: 'required_fields' })
  requiredFields!: string[]; // Dot-notation for required fields (e.g., 'department.code')

  @Column({ type: 'int', name: 'project_id' })
  projectId!: number;

  @Column({ type: 'boolean', default: false, name: 'is_template' })
  isTemplate!: boolean;

  @Column({
    type: 'enum',
    enum: ExtractionStrategy,
    default: ExtractionStrategy.OCR_FIRST,
    name: 'extractionStrategy',
  })
  extractionStrategy!: ExtractionStrategy;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @ManyToOne(() => ProjectEntity, (project) => project.schemas)
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
