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
import { GroupEntity } from './group.entity';
import { ModelEntity } from './model.entity';
import { ExtractorEntity } from './extractor.entity';
import { SchemaEntity } from './schema.entity';
import { UserEntity } from './user.entity';
import { ValidationScriptEntity } from './validation-script.entity';

@Entity({ name: 'projects' })
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'ocr_model_id' })
  ocrModelId!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'text_extractor_id' })
  textExtractorId!: string | null;

  @Column({ type: 'uuid', name: 'llm_model_id' })
  llmModelId!: string;

  @Column({ type: 'int', nullable: true, name: 'default_schema_id' })
  defaultSchemaId!: number | null;

  @Column({ type: 'int', name: 'user_id' })
  ownerId!: number;

  @ManyToOne(() => UserEntity, (user) => user.projects)
  @JoinColumn({ name: 'user_id' })
  owner!: UserEntity;

  @ManyToOne(() => ModelEntity, { nullable: true })
  @JoinColumn({ name: 'ocr_model_id' })
  ocrModel!: ModelEntity | null;

  @ManyToOne(() => ExtractorEntity, { nullable: true })
  @JoinColumn({ name: 'text_extractor_id' })
  textExtractor!: ExtractorEntity | null;

  @ManyToOne(() => ModelEntity)
  @JoinColumn({ name: 'llm_model_id' })
  llmModel!: ModelEntity;

  @OneToMany(() => GroupEntity, (group) => group.project)
  groups!: GroupEntity[];

  @OneToMany(() => SchemaEntity, (schema) => schema.project)
  schemas!: SchemaEntity[];

  @OneToMany(() => ValidationScriptEntity, (validationScript) => validationScript.project)
  validationScripts!: ValidationScriptEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
