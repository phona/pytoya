export interface LayoutParsingRequest {
  file?: string;
  image?: string;
  fileType?: number | null;
  useDocOrientationClassify?: boolean;
  useDocUnwarping?: boolean;
  useLayoutDetection?: boolean;
  useChartRecognition?: boolean;
  layoutThreshold?: number | Record<number, number>;
  layoutNms?: boolean;
  layoutUnclipRatio?:
    | number
    | [number, number]
    | Record<number, [number, number]>;
  layoutMergeBboxesMode?: string | Record<number, string>;
  promptLabel?: string;
  formatBlockContent?: boolean;
  repetitionPenalty?: number;
  temperature?: number;
  topP?: number;
  minPixels?: number;
  maxPixels?: number;
  prettifyMarkdown?: boolean;
  showFormulaNumber?: boolean;
  visualize?: boolean;
}

export interface ClientConfig {
  base_url?: string;
  endpoint?: string;
  timeout?: number;
  max_retries?: number;
  use_doc_orientation_classify?: boolean;
  use_doc_unwarping?: boolean;
  use_layout_detection?: boolean;
  use_chart_recognition?: boolean;
  format_block_content?: boolean;
  visualize?: boolean;
  prettify_markdown?: boolean;
  show_formula_number?: boolean;
}

export interface BlockContent {
  block_bbox?: number[];
  block_label?: string;
  block_content?: string;
  block_id?: number;
  block_order?: number | null;
}

export interface PrunedResult {
  parsing_res_list?: BlockContent[];
}

export interface MarkdownImages {
  text?: string;
  images?: Record<string, string>;
  isStart?: boolean;
  isEnd?: boolean;
}

export interface LayoutParsingResult {
  prunedResult?: PrunedResult;
  markdown?: MarkdownImages;
  outputImages?: Record<string, string>;
  inputImage?: string;
}

export interface DataInfo {
  [key: string]: unknown;
}

export interface LayoutParsingResponseData {
  layoutParsingResults?: LayoutParsingResult[];
  dataInfo?: DataInfo;
}

export interface ApiResponse {
  logId?: string;
  errorCode?: number;
  errorMsg?: string;
  result?: LayoutParsingResponseData;
}

export interface LayoutSummary {
  num_pages: number;
  num_blocks: number;
  blocks: BlockContent[];
}

export interface ExtractionResult {
  raw_text: string;
  markdown: string;
  layout: LayoutSummary;
  ocr_result: LayoutParsingResponseData;
}

export type OcrResponse = ExtractionResult;
