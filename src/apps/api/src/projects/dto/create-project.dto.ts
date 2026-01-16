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

  @IsOptional()
  @IsString()
  llmModelId?: string;

  @IsOptional()
  @IsString()
  defaultPromptId?: string;

  @IsOptional()
  @IsNumber()
  defaultSchemaId?: number;
}
