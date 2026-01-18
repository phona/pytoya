import { SchemaEntity } from '../../entities/schema.entity';
import { ExtractionStrategy } from '../../extraction/extraction.types';

export class SchemaResponseDto {
  id!: number;
  name!: string;
  jsonSchema!: Record<string, unknown>;
  requiredFields!: string[];
  projectId!: number;
  description!: string | null;
  extractionStrategy!: ExtractionStrategy;
  systemPromptTemplate!: string | null;
  validationSettings!: Record<string, unknown> | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(schema: SchemaEntity): SchemaResponseDto {
    return {
      id: schema.id,
      name: schema.name,
      jsonSchema: schema.jsonSchema,
      requiredFields: schema.requiredFields,
      projectId: schema.projectId,
      description: schema.description,
      extractionStrategy: schema.extractionStrategy,
      systemPromptTemplate: schema.systemPromptTemplate ?? null,
      validationSettings: schema.validationSettings ?? null,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    };
  }
}
