import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { SchemaRuleOperator, SchemaRuleType } from '../../entities/schema-rule.entity';
import { ValidationSeverity } from '../../entities/validation-script.entity';
import { CreateProjectDto } from './create-project.dto';

export class WizardSchemaRuleDto {
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

export class WizardValidationScriptDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  script!: string;

  @IsOptional()
  @IsEnum(ValidationSeverity)
  severity?: ValidationSeverity;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CreateProjectWizardDto {
  @ValidateNested()
  @Type(() => CreateProjectDto)
  project!: CreateProjectDto;

  @IsObject()
  jsonSchema!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WizardSchemaRuleDto)
  rules?: WizardSchemaRuleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WizardValidationScriptDto)
  validationScripts?: WizardValidationScriptDto[];
}

