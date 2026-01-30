import { ExtractorEntity } from '../../entities/extractor.entity';

const MASKED_SECRET = '********';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const maskSecrets = (config: Record<string, unknown>, secretKeys: string[]) => {
  if (secretKeys.length === 0) {
    return config;
  }

  const masked = { ...config };
  for (const key of secretKeys) {
    if (!(key in masked)) {
      continue;
    }
    const value = masked[key];
    if (value === undefined || value === null || value === '') {
      continue;
    }
    masked[key] = MASKED_SECRET;
  }
  return masked;
};

export class ExtractorResponseDto {
  id!: string;
  name!: string;
  description!: string | null;
  extractorType!: string;
  config!: Record<string, unknown>;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  usageCount?: number;

  static fromEntity(
    entity: ExtractorEntity,
    usageCount?: number,
    options: { secretKeys?: string[] } = {},
  ): ExtractorResponseDto {
    const config = isRecord(entity.config) ? entity.config : {};
    const secretKeys = options.secretKeys ?? [];

    return {
      id: entity.id,
      name: entity.name,
      description: entity.description ?? null,
      extractorType: entity.extractorType,
      config: maskSecrets(config, secretKeys),
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      usageCount,
    };
  }
}
