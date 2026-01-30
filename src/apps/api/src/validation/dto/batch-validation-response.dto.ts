import { ValidationResult } from '../../entities/manifest.entity';

export class BatchValidationErrorDto {
  message!: string;
  code?: string;
}

export class BatchValidationOutcomeDto {
  ok!: boolean;
  result?: ValidationResult;
  error?: BatchValidationErrorDto;
}

export class BatchValidationResponseDto {
  outcomesByManifestId!: Record<number, BatchValidationOutcomeDto>;
}

