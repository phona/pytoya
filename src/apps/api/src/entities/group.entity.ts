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
import { ManifestEntity } from './manifest.entity';
import { ProjectEntity } from './project.entity';

@Entity()
export class GroupEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'int', name: 'project_id' })
  projectId!: number;

  @ManyToOne(() => ProjectEntity, (project) => project.groups)
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @OneToMany(() => ManifestEntity, (manifest) => manifest.group)
  manifests!: ManifestEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
