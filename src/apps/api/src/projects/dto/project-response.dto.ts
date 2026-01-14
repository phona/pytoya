import { ProjectEntity } from '../../entities/project.entity';

export class ProjectResponseDto {
  id!: number;
  name!: string;
  description!: string | null;
  ownerId!: number;
  userId!: number;
  defaultProviderId!: string | null;
  defaultPromptId!: string | null;
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
      defaultProviderId: project.defaultProviderId ?? null,
      defaultPromptId: project.defaultPromptId ?? null,
      defaultSchemaId: project.defaultSchemaId ?? null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
