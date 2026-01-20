import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  textExtractorId!: string;

  @IsString()
  llmModelId!: string;

  @IsOptional()
  @IsNumber()
  defaultSchemaId?: number;
}
