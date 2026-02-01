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

@Entity('export_scripts')
export class ExportScriptEntity {
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

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Index()
  @Column({ type: 'int', default: 0 })
  priority!: number;

  @ManyToOne(() => ProjectEntity, (project) => project.exportScripts)
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

