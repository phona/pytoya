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

@Entity('schemas')
export class SchemaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'json' })
  jsonSchema!: Record<string, unknown>;

  @Column({ type: 'simple-array', nullable: true })
  requiredFields!: string[]; // Dot-notation for required fields (e.g., 'department.code')

  @Column({ type: 'int', name: 'project_id' })
  projectId!: number;

  @Column({ type: 'boolean', default: false })
  isTemplate!: boolean;

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
