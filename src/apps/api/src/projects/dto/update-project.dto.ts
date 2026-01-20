import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  textExtractorId?: string;

  @IsString()
  llmModelId!: string;

  @IsOptional()
  @IsNumber()
  defaultSchemaId?: number;
}
