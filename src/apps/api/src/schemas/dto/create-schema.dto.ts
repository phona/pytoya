import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSchemaDto {
  @IsObject()
  @IsNotEmpty()
  jsonSchema!: Record<string, unknown>;

  @IsNumber()
  projectId!: number;

  @IsOptional()
  @IsString()
  systemPromptTemplate?: string;

  @IsOptional()
  @IsObject()
  validationSettings?: Record<string, unknown>;

}
