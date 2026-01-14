import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ValidationSeverity } from '../../entities/validation-script.entity';

export class CreateValidationScriptDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  script!: string;

  @IsEnum(ValidationSeverity)
  @IsOptional()
  severity?: ValidationSeverity;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;
}
