import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { ManifestStatus } from '../../entities/manifest.entity';

export class ManifestFiltersDto {
  @IsOptional()
  @IsEnum(ManifestStatus)
  status?: ManifestStatus;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  groupId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projectId?: number;

  @IsOptional()
  @IsBoolean()
  humanVerified?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  confidenceMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  confidenceMax?: number;
}
