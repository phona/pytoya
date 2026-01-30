import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
} from 'class-validator';

import { ManifestStatus } from '../../entities/manifest.entity';
import { JsonPathMapConstraint } from '../validators/json-path.validator';

export class ManifestExportFiltersDto {
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

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

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  ocrQualityMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  ocrQualityMax?: number;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(['not_extracted', 'extracting', 'complete', 'partial', 'failed'])
  extractionStatus?: 'not_extracted' | 'extracting' | 'complete' | 'partial' | 'failed';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costMax?: number;

  @IsOptional()
  @IsString()
  textExtractorId?: string;

  @IsOptional()
  @IsString()
  extractorType?: string;
}
