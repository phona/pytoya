import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  Max,
  Min,
  Validate,
} from 'class-validator';

import { ManifestStatus } from '../../entities/manifest.entity';
import { JsonPathMapConstraint } from '../validators/json-path.validator';

export class ManifestExportFiltersDto {
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
  @IsObject()
  @Validate(JsonPathMapConstraint)
  filter?: Record<string, string>;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
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
