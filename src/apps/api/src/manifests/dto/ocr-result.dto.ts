export type OcrLayoutElementDto = {
  type: string;
  confidence: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  content?: string;
};

export type OcrTableDto = {
  rows: number;
  columns: number;
  headers: string[];
  data: string[][];
  confidence: number;
};

export class OcrPageResultDto {
  pageNumber!: number;
  text!: string;
  markdown!: string;
  confidence!: number;
  layout!: {
    elements: OcrLayoutElementDto[];
    tables: OcrTableDto[];
  };
}

export type OcrVisionAnalysisDto = {
  caption: string;
  detectedFields: Array<{
    field: string;
    value: string;
    confidence: number;
  }>;
  qualityWarnings: string[];
};

export class OcrResultDto {
  document!: {
    type: string;
    language: string[];
    pages: number;
  };
  pages!: OcrPageResultDto[];
  visionAnalysis?: OcrVisionAnalysisDto;
  metadata!: {
    processedAt: string;
    modelVersion?: string;
    processingTimeMs: number;
  };
  rawResponse?: Record<string, unknown>;
}

export class OcrResultResponseDto {
  manifestId!: number;
  ocrResult!: OcrResultDto | null;
  hasOcr!: boolean;
  ocrProcessedAt?: Date | null;
  qualityScore?: number | null;
}
