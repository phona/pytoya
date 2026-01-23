import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ValidationResult } from '../../entities/manifest.entity';

export class TestValidationScriptDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200_000)
  script!: string;

  @IsObject()
  extractedData!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  debug?: boolean;
}

export type ValidationScriptConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ValidationScriptConsoleEntry {
  level: ValidationScriptConsoleLevel;
  message: string;
}

export interface TestValidationScriptResponseDto {
  result: ValidationResult;
  debug?: {
    logs: ValidationScriptConsoleEntry[];
  };
  runtimeError?: {
    message: string;
    stack?: string;
  };
}

