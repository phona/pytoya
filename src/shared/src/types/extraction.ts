export type { ReExtractDto } from '../../../apps/api/src/extraction/dto/re-extract.dto';

export enum ExtractionStrategy {
  OCR_FIRST = 'ocr-first',
  VISION_FIRST = 'vision-first',
  VISION_ONLY = 'vision-only',
  TWO_STAGE = 'two-stage',
}
