import { OcrResultDto } from '../manifests/dto/ocr-result.dto';
import { ExtractedData } from '../prompts/types/prompts.types';
import { TextExtractionMetadata } from '../text-extractor/types/extractor.types';

export enum ExtractionStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  TEXT_EXTRACTING = 'TEXT_EXTRACTING',
  EXTRACTING = 'EXTRACTING',
  EXTRACTION_RETRY = 'EXTRACTION_RETRY',
  SAVING = 'SAVING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface TextExtractionState {
  text: string;
  markdown: string;
  metadata: TextExtractionMetadata;
  ocrResult?: OcrResultDto;
}

export interface ExtractionValidationResult {
  valid: boolean;
  missingFields: string[];
  errors: string[];
}

export interface ExtractionStateResult {
  data: ExtractedData;
  success: boolean;
  error?: string;
  retryCount: number;
  validation?: ExtractionValidationResult;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ExtractionWorkflowState {
  manifestId: number;
  status: ExtractionStatus;
  errors: string[];
  currentError?: string;
  maxRetries: number;
  extractionRetryCount: number;
  textResult?: TextExtractionState;
  extractionResult?: ExtractionStateResult;
  textCost?: number;
  llmCost?: number;
  extractionCost?: number;
}
