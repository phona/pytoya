import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateSchemaDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsOptional()
  @IsBoolean()
  includeExtractionHints?: boolean;
}
