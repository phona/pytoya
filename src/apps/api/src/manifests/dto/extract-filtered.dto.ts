import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

import { DynamicFieldFiltersDto } from './dynamic-field-filters.dto';

export class ExtractFilteredBehaviorDto {
  @IsOptional()
  @IsBoolean()
  includeCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  includeProcessing?: boolean;
}

export class ExtractFilteredDto {
  @ValidateNested()
  @Type(() => DynamicFieldFiltersDto)
  filters!: DynamicFieldFiltersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExtractFilteredBehaviorDto)
  behavior?: ExtractFilteredBehaviorDto;

  @IsOptional()
  @IsString()
  llmModelId?: string;

  @IsOptional()
  @IsString()
  textExtractorId?: string;

  @IsOptional()
  promptId?: number;
}
