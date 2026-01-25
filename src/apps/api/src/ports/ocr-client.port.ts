export type OcrTextResult = {
  markdown: string;
  pagesProcessed?: number;
  pagesTotal?: number;
  metadata?: Record<string, unknown>;
};

export interface OcrClientPort {
  extractText(options: {
    storagePath: string;
    extractorId?: string;
  }): Promise<OcrTextResult>;
}
