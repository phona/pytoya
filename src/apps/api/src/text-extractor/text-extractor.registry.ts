import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ExtractorMetadata,
  ExtractorValidationResult,
  TextExtractorClass,
  TextExtractorConfig,
} from './types/extractor.types';
import { PaddleOcrExtractor } from './extractors/paddle-ocr.extractor';
import { VisionLlmExtractor } from './extractors/vision-llm.extractor';
import { TesseractExtractor } from './extractors/tesseract.extractor';
import { BaseTextExtractor } from './base-text-extractor';

@Injectable()
export class TextExtractorRegistry implements OnModuleInit {
  private readonly registry = new Map<string, TextExtractorClass>();

  onModuleInit(): void {
    this.register(PaddleOcrExtractor);
    this.register(VisionLlmExtractor);
    this.register(TesseractExtractor);
  }

  register(extractor: TextExtractorClass): void {
    const metadata = extractor.metadata;
    if (!metadata?.id) {
      return;
    }
    this.registry.set(metadata.id, extractor);
  }

  get(extractorType: string): TextExtractorClass | undefined {
    return this.registry.get(extractorType);
  }

  list(): ExtractorMetadata[] {
    return Array.from(this.registry.values()).map((extractor) => extractor.metadata);
  }

  validateConfig(
    extractorType: string,
    config: TextExtractorConfig,
  ): ExtractorValidationResult {
    const extractor = this.get(extractorType);
    if (!extractor) {
      return { valid: false, errors: [`Unknown extractor type: ${extractorType}`] };
    }

    const schema = extractor.metadata?.paramsSchema ?? {};
    return BaseTextExtractor.validateAgainstSchema(schema, config);
  }
}
