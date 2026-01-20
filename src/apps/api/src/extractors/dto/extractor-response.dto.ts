import { ExtractorEntity } from '../../entities/extractor.entity';

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

  static fromEntity(entity: ExtractorEntity, usageCount?: number): ExtractorResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description ?? null,
      extractorType: entity.extractorType,
      config: entity.config ?? {},
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      usageCount,
    };
  }
}
