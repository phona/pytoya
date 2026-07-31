import { Logger } from '@nestjs/common';
import axios from 'axios';

export interface OcrBoxResult {
  text: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export class OcrServiceClient {
  private readonly logger = new Logger(OcrServiceClient.name);
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? 'http://localhost:8090';
  }

  async infer(imageBuffer: Buffer): Promise<OcrBoxResult[]> {
    try {
      const boundary = `----pytoya${Date.now()}`;
      const header =
        `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="image"; filename="page.png"\r\n' +
        'Content-Type: application/octet-stream\r\n\r\n';
      const footer = `\r\n--${boundary}--\r\n`;
      const body = Buffer.concat([
        Buffer.from(header, 'utf8'),
        imageBuffer,
        Buffer.from(footer, 'utf8'),
      ]);

      const response = await axios.post(
        `${this.baseUrl}/infer`,
        body,
        {
          timeout: 120000,
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
        },
      );
      const results = Array.isArray(response.data?.results) ? response.data.results : [];
      this.logger.log(`inference-ocr /infer returned ${results.length} boxes`);
      return results;
    } catch (error) {
      this.logger.warn(`inference-ocr service call failed: ${(error as Error).message}`);
      return [];
    }
  }
}
