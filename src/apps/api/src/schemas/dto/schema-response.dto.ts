import { SchemaEntity } from '../../entities/schema.entity';

export class SchemaResponseDto {
  id!: number;
  name!: string;
  schemaVersion!: string | null;
  jsonSchema!: Record<string, unknown>;
  requiredFields!: string[];
  projectId!: number;
  description!: string | null;
  systemPromptTemplate!: string | null;
  validationSettings!: Record<string, unknown> | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(schema: SchemaEntity): SchemaResponseDto {
    return {
      id: schema.id,
      name: schema.name,
      schemaVersion: schema.schemaVersion ?? null,
      jsonSchema: schema.jsonSchema,
      requiredFields: schema.requiredFields,
      projectId: schema.projectId,
      description: schema.description,
      systemPromptTemplate: schema.systemPromptTemplate ?? null,
      validationSettings: schema.validationSettings ?? null,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    };
  }
}
