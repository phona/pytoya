import { ValidationSeverity } from '../../entities/validation-script.entity';

export class GeneratedValidationScriptResponseDto {
  name!: string;
  description!: string;
  severity!: ValidationSeverity;
  script!: string;

  static fromGenerated(input: {
    name: string;
    description: string;
    severity: ValidationSeverity;
    script: string;
  }): GeneratedValidationScriptResponseDto {
    return {
      name: input.name,
      description: input.description,
      severity: input.severity,
      script: input.script,
    };
  }
}
