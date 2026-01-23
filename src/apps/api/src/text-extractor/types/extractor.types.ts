import { FileType } from '../../entities/manifest.entity';
import { ConvertedPage } from '../../pdf-to-image/pdf-to-image.service';
import { OcrResultDto } from '../../manifests/dto/ocr-result.dto';

export type ExtractorCategory = 'ocr' | 'vision' | 'hybrid';
export type ExtractorSupportedFormat = 'pdf' | 'image';

export type ExtractorParamType = 'string' | 'number' | 'boolean' | 'enum';

export interface ExtractorParamDefinition {
  type: ExtractorParamType;
  required: boolean;
  default?: unknown;
  label: string;
  placeholder?: string;
  secret?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
  helpText?: string;
}

export type ExtractorParamSchema = Record<string, ExtractorParamDefinition>;

export type PricingMode = 'token' | 'page' | 'fixed' | 'none';

export interface PricingConfig {
  mode: PricingMode;
  currency?: string;
  inputPricePerMillionTokens?: number;
  outputPricePerMillionTokens?: number;
  pricePerPage?: number;
  fixedCost?: number;
  minimumCharge?: number;
}

export interface ExtractorMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: ExtractorCategory;
  paramsSchema: ExtractorParamSchema;
  supportedFormats: ExtractorSupportedFormat[];
  defaultConfig?: Record<string, unknown>;
  pricingSchema?: ExtractorParamSchema;
}

export type ExtractorPreset = {
  id: string;
  name: string;
  description?: string;
  extractorType: string;
  config: Record<string, unknown>;
};

export type TextExtractionInput = {
  buffer: Buffer;
  fileType: FileType;
  filePath?: string;
  originalFilename?: string;
  mimeType?: string;
  pages?: ConvertedPage[];
};

export type TextExtractionMetadata = {
  extractorId: string;
  processingTimeMs: number;
  textCost: number;
  currency?: string;
  inputTokens?: number;
  outputTokens?: number;
  pagesProcessed?: number;
  estimated?: boolean;
  ocrResult?: OcrResultDto;
  qualityScore?: number;
};

export type TextExtractionResult = {
  text: string;
  markdown: string;
  metadata: TextExtractionMetadata;
};

export type ExtractorValidationResult = {
  valid: boolean;
  errors: string[];
};

export type TextExtractorConfig = Record<string, unknown> & {
  pricing?: PricingConfig;
};

export interface TextExtractor {
  extract(input: TextExtractionInput): Promise<TextExtractionResult>;
}

export type TextExtractorClass<TConfig extends TextExtractorConfig = TextExtractorConfig> = {
  new (config: TConfig, deps?: Record<string, unknown>): TextExtractor;
  metadata: ExtractorMetadata;
};
