import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ocrModelId?: string;

  @IsString()
  llmModelId!: string;

  @IsOptional()
  @IsNumber()
  defaultSchemaId?: number;
}
