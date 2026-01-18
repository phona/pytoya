import {
  IsNotEmpty,
  IsObject,
  IsOptional,
} from 'class-validator';

export class ValidateSchemaDto {
  @IsObject()
  @IsNotEmpty()
  jsonSchema!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
