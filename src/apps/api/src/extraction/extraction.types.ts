import { LayoutSummary, OcrResponse } from '../ocr/types/ocr.types';
import { OcrResultDto } from '../manifests/dto/ocr-result.dto';
import { ExtractedData } from '../prompts/types/prompts.types';
import { ConvertedPage } from '../pdf-to-image/pdf-to-image.service';

export enum ExtractionStrategy {
  OCR_FIRST = 'ocr-first',
  VISION_FIRST = 'vision-first',
  VISION_ONLY = 'vision-only',
  TWO_STAGE = 'two-stage',
}

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
  rawResponse?: OcrResponse;
  cachedResult?: OcrResultDto;
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
  ocrRetryCount: number;
  extractionRetryCount: number;
  strategy: ExtractionStrategy;
  ocrResult?: OcrState;
  extractionResult?: ExtractionStateResult;
  convertedPages?: ConvertedPage[];
  ocrCost?: number;
  llmCost?: number;
  extractionCost?: number;
}
