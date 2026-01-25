import type { OcrClientPort, OcrTextResult } from '../../ports/ocr-client.port';

export class FixtureOcrClient implements OcrClientPort {
  constructor(private readonly result: OcrTextResult) {}

  async extractText(
    _options: Parameters<OcrClientPort['extractText']>[0],
  ): Promise<OcrTextResult> {
    return this.result;
  }
}
