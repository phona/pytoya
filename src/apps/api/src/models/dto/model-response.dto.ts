import { ApiProperty } from '@nestjs/swagger';
import { adapterRegistry } from '../adapters/adapter-registry';
import { AdapterSchema } from '../adapters/adapter.interface';
import { ModelEntity } from '../../entities/model.entity';

export class ModelResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
  @ApiProperty({ example: 'OpenAI GPT-4o' })
  name!: string;
  @ApiProperty({ example: 'openai' })
  adapterType!: string;
  @ApiProperty({ nullable: true, example: 'Production model' })
  description!: string | null;
  @ApiProperty({ nullable: true, example: 'llm' })
  category!: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true })
  parameters!: Record<string, unknown>;
  @ApiProperty({ example: true })
  isActive!: boolean;
  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt!: Date;
  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  updatedAt!: Date;

  static fromEntity(model: ModelEntity): ModelResponseDto {
    const schema = adapterRegistry.getSchema(model.adapterType);
    const maskedParameters = maskParameters(model.parameters, schema);
    return {
      id: model.id,
      name: model.name,
      adapterType: model.adapterType,
      description: model.description ?? null,
      category: schema?.category ?? null,
      parameters: maskedParameters,
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}

const maskParameters = (
  parameters: Record<string, unknown>,
  schema?: AdapterSchema,
): Record<string, unknown> => {
  if (!schema) {
    return { ...parameters };
  }

  const masked: Record<string, unknown> = { ...parameters };
  for (const [key, definition] of Object.entries(schema.parameters)) {
    if (!definition.secret) {
      continue;
    }
    if (key in masked) {
      masked[key] = '********';
    }
  }
  return masked;
};
