import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PendingCropsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number = 0.8;
}

export class PendingCropItemDto {
  field!: string;
  page!: number;
  cropImage!: string;
  ocrText!: string;
  confidence!: number | null;
  reason!: string;
  bbox!: number[];
}

export class PendingCropsResponseDto {
  items!: PendingCropItemDto[];
  total!: number;
}
