import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CorrectionAnalysisQueryDto {
  @IsOptional()
  @IsString()
  since?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class GenerateRulesFromCorrectionsDto {
  @IsString()
  modelId!: string;

  @IsOptional()
  @IsString()
  since?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export interface CorrectionExample {
  before: unknown;
  after: unknown;
  count: number;
}

export interface CorrectedFieldSummary {
  path: string;
  count: number;
  examples: CorrectionExample[];
}

export interface OcrConfusion {
  from: string;
  to: string;
  count: number;
  contexts: string[];
}

export interface CorrectionSuggestionPattern {
  before: string;
  after: string;
  count: number;
}

export interface CorrectionSuggestion {
  fieldPath: string;
  correctionCount: number;
  patterns: CorrectionSuggestionPattern[];
  suggestedRule: string;
}

export class CorrectionSuggestionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  threshold?: number;
}

export interface CorrectionAnalysisResult {
  totalLogs: number;
  totalDiffs: number;
  dateRange: { from: string | null; to: string | null };
  topCorrectedFields: CorrectedFieldSummary[];
  ocrConfusions: OcrConfusion[];
  summary: {
    manifestsWithCorrections: number;
    uniqueFieldsCorrected: number;
    avgDiffsPerLog: number;
  };
}
