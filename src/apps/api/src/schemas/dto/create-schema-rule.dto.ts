import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SchemaRuleOperator, SchemaRuleType } from '../../entities/schema-rule.entity';

export class CreateSchemaRuleDto {
  @IsNumber()
  schemaId!: number;

  @IsString()
  fieldPath!: string;

  @IsEnum(SchemaRuleType)
  ruleType!: SchemaRuleType;

  @IsEnum(SchemaRuleOperator)
  ruleOperator!: SchemaRuleOperator;

  @IsOptional()
  @IsObject()
  ruleConfig?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
