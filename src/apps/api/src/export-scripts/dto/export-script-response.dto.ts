import { ExportScriptEntity } from '../../entities/export-script.entity';

export class ExportScriptResponseDto {
  id!: number;
  name!: string;
  description!: string | null;
  projectId!: number;
  script!: string;
  enabled!: boolean;
  priority!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(entity: ExportScriptEntity): ExportScriptResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      projectId: entity.projectId,
      script: entity.script,
      enabled: entity.enabled,
      priority: entity.priority,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

