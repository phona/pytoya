import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class BulkExtractDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  manifestIds!: number[];

  @IsOptional()
  @IsString()
  llmModelId?: string;

  @IsOptional()
  @IsString()
  textExtractorId?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  promptId?: number;
}
