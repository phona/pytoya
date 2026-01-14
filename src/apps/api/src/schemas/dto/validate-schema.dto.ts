import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class ValidateSchemaDto {
  @IsObject()
  @IsNotEmpty()
  jsonSchema!: Record<string, unknown>;

  @IsObject()
  data!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredFields?: string[];
}
