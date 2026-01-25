import { BadRequestException, Injectable } from '@nestjs/common';

import { ExtractorRepository } from '../extractors/extractor.repository';
import { ExtractorEntity } from '../entities/extractor.entity';
import { FileType } from '../entities/manifest.entity';
import { ConvertedPage, PdfToImageService } from '../pdf-to-image/pdf-to-image.service';
import { calculateOcrQualityScore } from '../ocr/ocr-cache.util';
import { OcrResultDto } from '../manifests/dto/ocr-result.dto';
import { TextExtractorFactory } from './text-extractor.factory';
import { TextExtractorRegistry } from './text-extractor.registry';
import {
  TextExtractionInput,
  TextExtractionResult,
} from './types/extractor.types';

@Injectable()
export class TextExtractorService {
  constructor(
    private readonly extractorRepository: ExtractorRepository,
    private readonly extractorFactory: TextExtractorFactory,
    private readonly extractorRegistry: TextExtractorRegistry,
    private readonly pdfToImageService: PdfToImageService,
  ) {}

  async extract(extractorId: string, input: TextExtractionInput): Promise<{
    extractor: ExtractorEntity;
    result: TextExtractionResult;
  }> {
    const extractor = await this.extractorRepository.findOne(extractorId);
    if (!extractor) {
      throw new BadRequestException(`Extractor ${extractorId} not found`);
    }
    if (!extractor.isActive) {
      throw new BadRequestException(`Extractor ${extractor.name} is inactive`);
    }

    const extractorType = extractor.extractorType;
    const extractorClass = this.extractorRegistry.get(extractorType);
    if (!extractorClass) {
      throw new BadRequestException(`Unknown extractor type: ${extractorType}`);
    }

    const instance = this.extractorFactory.createInstance(
      extractorType,
      extractor.config ?? {},
      extractor.id,
    );

    const supportedFormats = extractorClass.metadata.supportedFormats ?? [];
    const shouldConvert =
      input.fileType === FileType.PDF &&
      !supportedFormats.includes('pdf') &&
      supportedFormats.includes('image');

    const pages = shouldConvert
      ? await this.convertPdfToPages(input.filePath)
      : input.pages;

    const extractionInput: TextExtractionInput = {
      ...input,
      pages,
    };

    const result = await instance.extract(extractionInput);
    const metadata = result.metadata ?? {
      extractorId: extractor.id,
      processingTimeMs: 0,
      textCost: 0,
    };

    metadata.extractorId = extractor.id;

    if (!metadata.ocrResult) {
      metadata.ocrResult = this.buildFallbackOcrResult(result, extractor.name);
    }

    if (metadata.qualityScore === undefined && metadata.ocrResult) {
      metadata.qualityScore = calculateOcrQualityScore(metadata.ocrResult);
    }

    result.metadata = metadata;
    return { extractor, result };
  }

  private buildFallbackOcrResult(result: TextExtractionResult, extractorName: string): OcrResultDto {
    return {
      document: {
        type: 'unknown',
        language: [],
        pages: 1,
      },
      pages: [
        {
          pageNumber: 1,
          text: result.text,
          markdown: result.markdown,
          confidence: 0.75,
          layout: {
            elements: [],
            tables: [],
          },
        },
      ],
      metadata: {
        processedAt: new Date().toISOString(),
        modelVersion: extractorName,
        processingTimeMs: result.metadata.processingTimeMs,
      },
      rawResponse: undefined,
    };
  }

  private async convertPdfToPages(filePath?: string): Promise<ConvertedPage[] | undefined> {
    if (!filePath) {
      throw new BadRequestException('PDF file path is required for image-based extractors');
    }
    return this.pdfToImageService.convertPdfToImages(filePath);
  }
}
