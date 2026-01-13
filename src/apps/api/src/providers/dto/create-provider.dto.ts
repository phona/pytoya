import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

import { ProviderType } from '../../entities/provider.entity';

export class CreateProviderDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(ProviderType)
  type!: ProviderType;

  @IsString()
  @MinLength(1)
  baseUrl!: string;

  @IsString()
  @MinLength(1)
  apiKey!: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  @Type(() => Number)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxTokens?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
