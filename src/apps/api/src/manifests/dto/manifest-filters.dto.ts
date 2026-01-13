import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
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
  @IsString()
  poNo?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateTo?: Date;

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
