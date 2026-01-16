import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { ManifestStatus } from '../../entities/manifest.entity';

export class UpdateManifestDto {
  @IsEnum(ManifestStatus)
  @IsOptional()
  status?: ManifestStatus;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  @Type(() => Number)
  confidence?: number;

  @IsBoolean()
  @IsOptional()
  humanVerified?: boolean;

  @IsOptional()
  @IsObject()
  extractedData?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  purchaseOrder?: string;

  @IsOptional()
  @IsString()
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  department?: string;
}
