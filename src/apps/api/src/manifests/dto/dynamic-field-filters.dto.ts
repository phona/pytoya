import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  Max,
  Min,
} from 'class-validator';

import { ManifestStatus } from '../../entities/manifest.entity';
import {
  JsonPathConstraint,
  JsonPathMapConstraint,
} from '../validators/json-path.validator';

export class DynamicFieldFiltersDto {
  @IsOptional()
  @IsObject()
  @Validate(JsonPathMapConstraint)
  filter?: Record<string, string>;

  @IsOptional()
  @IsString()
  @Validate(JsonPathConstraint)
  sortBy?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsEnum(ManifestStatus)
  status?: ManifestStatus;

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
