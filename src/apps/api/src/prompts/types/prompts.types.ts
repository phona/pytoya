export interface ExtractionPromptOptions {
  ocrMarkdown: string;
}

export interface ReExtractPromptOptions {
  ocrMarkdown: string;
  previousResult: ExtractedData;
  missingFields?: string[];
  errorMessage?: string;
}

export interface ExtractedData {
  department?: {
    code?: string;
    name?: string;
  };
  invoice?: {
    po_no?: string;
    invoice_date?: string;
    usage?: string;
  };
  items?: Array<{
    name?: string;
    quantity?: number;
    unit?: string;
    unit_price_ex_tax?: number;
    unit_price_inc_tax?: number;
    total_amount_inc_tax?: number;
    cost?: string;
  }>;
  _extraction_info?: {
    ocr_issues?: string[];
    uncertain_fields?: string[];
    suggestions?: string[];
    notes?: string;
    confidence?: number;
  };
}
