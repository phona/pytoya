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
      const form = new FormData();
      form.append(
        'image',
        new Blob([imageBuffer], { type: 'application/octet-stream' }),
        'page.png',
      );
      const response = await axios.post(
        `${this.baseUrl}/infer`,
        form,
        { timeout: 30000, headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data.results;
    } catch (error) {
      this.logger.warn(`inference-ocr service call failed: ${(error as Error).message}`);
      return [];
    }
  }
}
