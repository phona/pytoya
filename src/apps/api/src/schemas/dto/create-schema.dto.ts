import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateSchemaDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsObject()
  @IsNotEmpty()
  jsonSchema!: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  requiredFields!: string[];

  @IsNumber()
  projectId!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}
