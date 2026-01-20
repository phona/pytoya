import { ProjectEntity } from '../../entities/project.entity';

export class ProjectResponseDto {
  id!: number;
  name!: string;
  description!: string | null;
  ownerId!: number;
  userId!: number;
  textExtractorId!: string | null;
  llmModelId!: string;
  defaultSchemaId!: number | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(project: ProjectEntity): ProjectResponseDto {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      userId: project.ownerId,
      textExtractorId: project.textExtractorId ?? null,
      llmModelId: project.llmModelId,
      defaultSchemaId: project.defaultSchemaId ?? null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
