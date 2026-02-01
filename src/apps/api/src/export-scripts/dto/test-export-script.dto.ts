import { IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export type ExportScriptFormat = 'csv' | 'xlsx';

export class TestExportScriptDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200_000)
  script!: string;

  @IsObject()
  extractedData!: Record<string, unknown>;

  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  format?: ExportScriptFormat;

  @IsOptional()
  @IsBoolean()
  debug?: boolean;
}

export type ExportScriptConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ExportScriptConsoleEntry {
  level: ExportScriptConsoleLevel;
  message: string;
}

export interface TestExportScriptResponseDto {
  rows: Array<Record<string, unknown>>;
  debug?: { logs: ExportScriptConsoleEntry[] };
  runtimeError?: { message: string; stack?: string };
}

