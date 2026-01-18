import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class GenerateRulesDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsObject()
  jsonSchema?: Record<string, unknown>;
}
