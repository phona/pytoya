import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { ExtractionStrategy } from '../extraction/extraction.types';
import { SchemaRuleEntity } from './schema-rule.entity';

@Entity('schemas')
export class SchemaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'jsonb', name: 'json_schema' })
  jsonSchema!: Record<string, unknown>;

  @Column({ type: 'text', array: true, nullable: true, name: 'required_fields', default: () => "'{}'" })
  requiredFields!: string[]; // Derived from jsonSchema.required using dot notation (e.g., 'department.code')

  @Column({ type: 'int', name: 'project_id' })
  projectId!: number;

  @Column({
    type: 'enum',
    enum: ExtractionStrategy,
    default: ExtractionStrategy.OCR_FIRST,
    name: 'extractionStrategy',
  })
  extractionStrategy!: ExtractionStrategy;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true, name: 'system_prompt_template' })
  systemPromptTemplate!: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'validation_settings' })
  validationSettings!: Record<string, unknown> | null;

  @ManyToOne(() => ProjectEntity, (project) => project.schemas)
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @OneToMany(() => SchemaRuleEntity, (rule) => rule.schema)
  rules!: SchemaRuleEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
