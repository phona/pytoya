export interface ExtractionPromptOptions {
  ocrMarkdown: string;
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
