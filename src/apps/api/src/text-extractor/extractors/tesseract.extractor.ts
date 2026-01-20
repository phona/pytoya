import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

import { BaseTextExtractor } from '../base-text-extractor';
import {
  ExtractorMetadata,
  TextExtractionInput,
  TextExtractionResult,
  TextExtractorConfig,
} from '../types/extractor.types';
import { PRICING_SCHEMA } from '../types/pricing-schema';

const execFileAsync = promisify(execFile);

export type TesseractConfig = TextExtractorConfig & {
  binaryPath?: string;
  lang?: string;
  psm?: number;
  oem?: number;
};

export class TesseractExtractor extends BaseTextExtractor<TesseractConfig> {
  static metadata: ExtractorMetadata = {
    id: 'tesseract',
    name: 'Tesseract OCR',
    description: 'Open-source OCR engine for local processing',
    version: '1.0.0',
    category: 'ocr',
    supportedFormats: ['image'],
    pricingSchema: PRICING_SCHEMA,
    paramsSchema: {
      binaryPath: {
        type: 'string',
        required: false,
        label: 'Binary Path',
        placeholder: 'tesseract',
      },
      lang: {
        type: 'string',
        required: false,
        default: 'chi_sim+eng',
        label: 'Language',
      },
      psm: {
        type: 'number',
        required: false,
        default: 6,
        label: 'Page Segmentation Mode',
        validation: { min: 0, max: 13 },
      },
      oem: {
        type: 'number',
        required: false,
        default: 1,
        label: 'OCR Engine Mode',
        validation: { min: 0, max: 3 },
      },
    },
  };

  async extract(input: TextExtractionInput): Promise<TextExtractionResult> {
    const start = Date.now();
    const pages = input.pages ?? [{ pageNumber: 1, buffer: input.buffer, mimeType: input.mimeType ?? 'image/png' }];

    const textChunks: string[] = [];
    for (const page of pages) {
      const text = await this.extractFromBuffer(page.buffer, page.mimeType);
      textChunks.push(text.trim());
    }

    const text = textChunks.join('\n\n');
    const pagesProcessed = pages.length;
    const textCost = this.calculatePageCost(pagesProcessed) || this.calculateFixedCost();

    return {
      text,
      markdown: text,
      metadata: {
        extractorId: TesseractExtractor.metadata.id,
        processingTimeMs: Date.now() - start,
        textCost,
        currency: this.getPricing().currency,
        pagesProcessed,
      },
    };
  }

  private async extractFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = this.resolveExtension(mimeType);
    const tempPath = join(tmpdir(), `tesseract-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);

    try {
      await fs.writeFile(tempPath, buffer);
      const args = [
        tempPath,
        'stdout',
        '-l',
        this.config.lang ?? 'chi_sim+eng',
        '--psm',
        String(this.config.psm ?? 6),
        '--oem',
        String(this.config.oem ?? 1),
      ];

      const { stdout } = await execFileAsync(this.config.binaryPath ?? 'tesseract', args, {
        maxBuffer: 20 * 1024 * 1024,
      });

      return stdout ?? '';
    } finally {
      await fs.unlink(tempPath).catch(() => undefined);
    }
  }

  private resolveExtension(mimeType: string): string {
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      return '.jpg';
    }
    if (mimeType.includes('webp')) {
      return '.webp';
    }
    if (mimeType.includes('bmp')) {
      return '.bmp';
    }
    return '.png';
  }
}
