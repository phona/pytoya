import { LayoutSummary } from '../ocr/types/ocr.types';
import { ExtractedData } from '../prompts/types/prompts.types';

export enum ExtractionStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  OCR_PROCESSING = 'OCR_PROCESSING',
  OCR_RETRY = 'OCR_RETRY',
  EXTRACTING = 'EXTRACTING',
  EXTRACTION_RETRY = 'EXTRACTION_RETRY',
  SAVING = 'SAVING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface OcrState {
  rawText: string;
  markdown: string;
  layout?: LayoutSummary;
  success: boolean;
  error?: string;
  retryCount: number;
}

export interface ExtractionValidationResult {
  valid: boolean;
  missingFields: string[];
  errors: string[];
}

export interface ExtractionStateResult {
  data: ExtractedData | Record<string, unknown>;
  success: boolean;
  error?: string;
  retryCount: number;
  validation?: ExtractionValidationResult;
}

export interface ExtractionWorkflowState {
  manifestId: number;
  status: ExtractionStatus;
  errors: string[];
  currentError?: string;
  maxRetries: number;
  ocrRetryCount: number;
  extractionRetryCount: number;
  ocrResult?: OcrState;
  extractionResult?: ExtractionStateResult;
}
