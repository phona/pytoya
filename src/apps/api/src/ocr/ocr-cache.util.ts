import { ModelEntity } from '../entities/model.entity';
import { OcrResultDto } from '../manifests/dto/ocr-result.dto';
import { OcrResponse } from './types/ocr.types';

const buildPosition = (bbox?: number[]) => {
  if (!bbox || bbox.length !== 4) {
    return undefined;
  }
  const [x1, y1, x2, y2] = bbox;
  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
  };
};

const detectLanguage = (text: string): string | null => {
  if (!text) {
    return null;
  }
  if (/[\u4e00-\u9fff]/.test(text)) {
    return 'zh';
  }
  if (/[A-Za-z]/.test(text)) {
    return 'en';
  }
  return null;
};

export const buildCachedOcrResult = (
  response: OcrResponse,
  processingTimeMs: number,
  ocrModel?: ModelEntity,
): OcrResultDto => {
  const pages = response.ocr_result.layoutParsingResults ?? [];
  const pageResults = pages.map((page, index) => {
    const blocks = page.prunedResult?.parsing_res_list ?? [];
    const text = blocks.map((block) => block.block_content ?? '').join('\n');
    const markdown = page.markdown?.text ?? '';
    const elements = blocks.map((block) => ({
      type: block.block_label ?? 'paragraph',
      confidence: 1,
      position: buildPosition(block.block_bbox),
      content: block.block_content ?? undefined,
    }));

    return {
      pageNumber: index + 1,
      text,
      markdown,
      confidence: text ? 0.9 : 0.5,
      layout: {
        elements,
        tables: [],
      },
    };
  });

  const fullText = pageResults.map((page) => page.text).join('\n');
  const language = detectLanguage(fullText);

  return {
    document: {
      type: 'invoice',
      language: language ? [language] : [],
      pages: pageResults.length || response.layout.num_pages,
    },
    pages: pageResults,
    metadata: {
      processedAt: new Date().toISOString(),
      modelVersion: ocrModel?.name,
      processingTimeMs,
    },
    rawResponse: response.ocr_result as Record<string, unknown>,
  };
};

export const calculateOcrQualityScore = (result: OcrResultDto): number => {
  const pages = result.pages?.length ?? result.document?.pages ?? 0;
  const totalText = result.pages
    ? result.pages.reduce((sum, page) => sum + (page.text?.length ?? 0), 0)
    : 0;
  const textCoverage = pages > 0
    ? Math.min(1, totalText / (pages * 800))
    : 0;

  const confidences = result.pages
    .flatMap((page) => page.layout?.elements ?? [])
    .map((element) => element.confidence)
    .filter((value) => Number.isFinite(value));
  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : totalText > 0
        ? 0.85
        : 0;

  const layoutDetection = result.pages.some(
    (page) =>
      (page.layout?.elements?.length ?? 0) > 0 ||
      (page.layout?.tables?.length ?? 0) > 0,
  )
    ? 1
    : 0;

  const languageMatch = result.document.language?.length ? 1 : 0.6;

  const score =
    textCoverage * 0.3 +
    avgConfidence * 0.4 +
    layoutDetection * 0.2 +
    languageMatch * 0.1;

  return Math.max(0, Math.min(100, Math.round(score * 100)));
};
