import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class ReExtractFieldPreviewDto {
  @IsString()
  @IsNotEmpty()
  fieldName!: string;

  @IsOptional()
  @IsString()
  llmModelId?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  promptId?: number;

  @IsOptional()
  @IsString()
  customPrompt?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeOcrContext?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  previewOnly?: boolean;
}

export class OcrContextPreviewDto {
  fieldName!: string;
  snippet!: string;
  pageNumber?: number;
  confidence?: number;
}

export class ReExtractFieldPreviewResponseDto {
  jobId?: string;
  fieldName!: string;
  ocrPreview?: OcrContextPreviewDto;
  estimatedCost!: number;
  currency!: string;
}
