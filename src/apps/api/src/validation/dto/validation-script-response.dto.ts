import {
  ValidationScriptEntity,
  ValidationSeverity,
} from '../../entities/validation-script.entity';

export class ValidationScriptResponseDto {
  id!: number;
  name!: string;
  description!: string | null;
  projectId!: number;
  script!: string;
  severity!: ValidationSeverity;
  enabled!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(
    script: ValidationScriptEntity,
  ): ValidationScriptResponseDto {
    return {
      id: script.id,
      name: script.name,
      description: script.description,
      projectId: script.projectId,
      script: script.script,
      severity: script.severity,
      enabled: script.enabled,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt,
    };
  }
}
