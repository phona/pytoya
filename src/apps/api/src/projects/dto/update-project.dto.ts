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
  llmModelId?: string;

  @IsOptional()
  @IsNumber()
  defaultSchemaId?: number;
}
