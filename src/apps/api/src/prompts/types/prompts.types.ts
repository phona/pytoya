export interface ExtractionPromptOptions {
  ocrMarkdown: string;
}

export interface FewShotExample {
  ocrSnippet: string;
  extractedData: ExtractedData;
}

export interface OcrDomainHints {
  documentType?: string;
  language?: string;
  knownConfusions?: Array<{ from: string; to: string; context?: string }>;
  fieldHints?: Array<{ field: string; hint: string }>;
  customInstructions?: string;
}

export interface ExtractionPromptEnhancements {
  ocrQualityScore?: number;
  structuredTables?: OcrTableData[];
  fewShotExamples?: FewShotExample[];
  ocrDomainHints?: OcrDomainHints;
}

export interface OcrTableData {
  pageNumber: number;
  cells: string[][];
}

export interface ReExtractPromptOptions {
  ocrMarkdown: string;
  previousResult: ExtractedData;
  missingFields?: string[];
  errorMessage?: string;
}

// Dynamic extracted data type - validated by JSON Schema via ajv
// The structure is defined by the schema associated with the project
export type ExtractedData = Record<string, unknown>;
