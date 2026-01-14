import { SchemaEntity } from '../../entities/schema.entity';
import { ExtractionStrategy } from '../../extraction/extraction.types';

export class SchemaResponseDto {
  id!: number;
  name!: string;
  jsonSchema!: Record<string, unknown>;
  requiredFields!: string[];
  projectId!: number;
  isTemplate!: boolean;
  description!: string | null;
  extractionStrategy!: ExtractionStrategy;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(schema: SchemaEntity): SchemaResponseDto {
    return {
      id: schema.id,
      name: schema.name,
      jsonSchema: schema.jsonSchema,
      requiredFields: schema.requiredFields,
      projectId: schema.projectId,
      isTemplate: schema.isTemplate,
      description: schema.description,
      extractionStrategy: schema.extractionStrategy,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    };
  }
}
