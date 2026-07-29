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
      const base64 = imageBuffer.toString('base64');
      const response = await axios.post(
        `${this.baseUrl}/infer`,
        { image: base64 },
        { timeout: 30000 },
      );
      return response.data.results;
    } catch (error) {
      this.logger.warn(`inference-ocr service call failed: ${(error as Error).message}`);
      return [];
    }
  }
}
