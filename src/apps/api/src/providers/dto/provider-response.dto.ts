import { ProviderEntity, ProviderType } from '../../entities/provider.entity';

export class ProviderResponseDto {
  id!: number;
  name!: string;
  type!: ProviderType;
  baseUrl!: string;
  apiKey!: string;
  modelName!: string | null;
  temperature!: number | null;
  maxTokens!: number | null;
  supportsVision!: boolean;
  supportsStructuredOutput!: boolean;
  isDefault!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(provider: ProviderEntity): ProviderResponseDto {
    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      modelName: provider.modelName,
      temperature: provider.temperature,
      maxTokens: provider.maxTokens,
      supportsVision: provider.supportsVision,
      supportsStructuredOutput: provider.supportsStructuredOutput,
      isDefault: provider.isDefault,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }
}
