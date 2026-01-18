import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ExtractionStrategy } from '../../extraction/extraction.types';

export class CreateSchemaDto {
  @IsObject()
  @IsNotEmpty()
  jsonSchema!: Record<string, unknown>;

  @IsNumber()
  projectId!: number;

  @IsOptional()
  @IsString()
  systemPromptTemplate?: string;

  @IsOptional()
  @IsObject()
  validationSettings?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(ExtractionStrategy)
  extractionStrategy?: ExtractionStrategy;
}
