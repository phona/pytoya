export const OCR_CONTEXT_TOO_LARGE_MESSAGE =
  'OCR context too large for extraction; choose a larger-context model or reduce pages.';

export class OcrContextTooLargeError extends Error {
  constructor(message: string = OCR_CONTEXT_TOO_LARGE_MESSAGE) {
    super(message);
    this.name = 'OcrContextTooLargeError';
  }
}