import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

export enum ValidationSeverity {
  WARNING = 'warning',
  ERROR = 'error',
}

@Entity()
export class ValidationScriptEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Index()
  @Column({ type: 'int', name: 'project_id' })
  projectId!: number;

  @Column({ type: 'text' })
  script!: string;

  @Index()
  @Column({ type: 'enum', enum: ValidationSeverity, default: ValidationSeverity.WARNING })
  severity!: ValidationSeverity;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'boolean', name: 'is_template', default: false })
  isTemplate!: boolean;

  @ManyToOne(() => ProjectEntity, (project) => project.validationScripts)
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
