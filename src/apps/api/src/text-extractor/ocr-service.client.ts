import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface OcrBoxResult {
  text: string;
  confidence: number;
  bbox: [number, number, number, number];
}

@Injectable()
export class OcrServiceClient {
  private readonly logger = new Logger(OcrServiceClient.name);
  private readonly baseUrl: string;

  constructor(configServiceOrUrl?: ConfigService | string) {
    if (typeof configServiceOrUrl === 'string') {
      this.baseUrl = configServiceOrUrl;
    } else if (configServiceOrUrl) {
      this.baseUrl = configServiceOrUrl.get<string>('ocrService.baseUrl', 'http://localhost:8090');
    } else {
      this.baseUrl = 'http://localhost:8090';
    }
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
