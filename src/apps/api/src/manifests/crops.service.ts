import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sharp from 'sharp';
import { Repository } from 'typeorm';

import { ExtractionHistoryEntity } from '../entities/extraction-history.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { UserEntity } from '../entities/user.entity';
import { PdfToImageService } from '../pdf-to-image/pdf-to-image.service';
import { TextExtractorRegistry } from '../text-extractor/text-extractor.registry';
import { UpdateManifestUseCase } from '../usecases/update-manifest.usecase';
import type { CorrectionData } from '../text-extractor/types/extractor.types';
import type { PendingCropItemDto, PendingCropsResponseDto } from './dto/pending-crops.dto';

@Injectable()
export class CropsService {
  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepo: Repository<ManifestEntity>,
    @InjectRepository(ExtractionHistoryEntity)
    private readonly historyRepo: Repository<ExtractionHistoryEntity>,
    private readonly updateManifestUseCase: UpdateManifestUseCase,
    private readonly extractorRegistry: TextExtractorRegistry,
    private readonly pdfToImageService: PdfToImageService,
  ) {}

  async getPendingCrops(manifestId: number, _threshold: number): Promise<PendingCropsResponseDto> {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest) throw new NotFoundException();

    const latestExtraction = await this.historyRepo.findOne({
      where: { manifestId, reason: 'extraction' },
      order: { createdAt: 'DESC' },
    });

    // Prefer manifest.extractedData (holds the actual extraction result); fall back
    // to the latest completed history entry if the manifest field is empty.
    const manifestData = (manifest.extractedData as Record<string, unknown> | null | undefined) ?? null;
    const historyData = latestExtraction?.extractedData as Record<string, unknown> | null | undefined;
    const sourceData = (manifestData && (manifestData as any)._human_review)
      ? manifestData
      : historyData;
    if (!sourceData) return { items: [], total: 0 };

    const humanReview = (sourceData as any)?._human_review ?? [];
    if (humanReview.length === 0) return { items: [], total: 0 };

    const verifiedRecords = await this.historyRepo.find({
      where: { manifestId, reason: 'manual_crop_verification' },
    });
    const verifiedFields = new Set(
      verifiedRecords.map((r) => (r.changes as any)?.field),
    );

    const pending = humanReview.filter(
      (item: any) => !verifiedFields.has(item.field),
    );

    // Fallback: collect inference-ocr boxes from merged ocr_result for bbox matching.
    const boxes = ((manifest.ocrResult as any)?.rawResponse?.boxes as Array<{
      text?: string;
      bbox?: number[];
      page?: number;
      confidence?: number;
    }> | undefined) ?? [];

    const items: PendingCropItemDto[] = [];
    for (const item of pending) {
      const ocrText = item.ocr_text;
      const hasValidBbox = Array.isArray(item.bbox) &&
        item.bbox.length === 4 &&
        item.bbox.some((v: number) => v !== 0);
      const bbox = hasValidBbox
        ? (item.bbox as number[])
        : this.matchBboxByText(boxes, ocrText, item.page);
      const cropBase64 = bbox ? await this.cropFromFile(manifest.storagePath, bbox, manifest.fileType, item.page) : null;
      items.push({
        field: item.field,
        page: item.page,
        cropImage: cropBase64 ?? '',
        ocrText,
        confidence: item.confidence ?? null,
        reason: item.reason,
        bbox: bbox ?? [],
      });
    }

    return { items, total: items.length };
  }

  private matchBboxByText(
    boxes: Array<{ text?: string; bbox?: number[]; page?: number }>,
    ocrText: string,
    page: number,
  ): number[] | null {
    if (!ocrText || boxes.length === 0) return null;
    const normalized = ocrText.trim();
    if (!normalized) return null;

    // Prefer exact text match on the same page.
    let best: number[] | null = null;
    for (const box of boxes) {
      if (box.page !== undefined && box.page !== page) continue;
      const boxText = (box.text ?? '').trim();
      if (boxText && (boxText === normalized || normalized.includes(boxText) || boxText.includes(normalized))) {
        if (Array.isArray(box.bbox) && box.bbox.length === 4) {
          best = box.bbox;
          break;
        }
      }
    }
    return best;
  }

  /**
   * TODO(v2): Support multi-page PDF extraction.
   * For v1:
   *   - For PDFs: returns the whole file (frontend handles PDF rendering)
   *   - For images: single page, returns as-is
   *   - The `page` parameter is reserved for future multi-page support
   */
  async getPageImage(manifestId: number, page: number) {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest || !manifest.storagePath) return null;
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(manifest.storagePath);
    const mimeType = manifest.fileType === 'pdf' ? 'application/pdf' : 'image/png';
    return { buffer, mimeType };
  }

  async verifyCrop(
    manifestId: number,
    field: string,
    page: number,
    correctedText: string,
    adjustedBbox: number[] | undefined,
    user: UserEntity,
  ) {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest) throw new NotFoundException();

    const verifiedRecords = await this.historyRepo.find({
      where: { manifestId, reason: 'manual_crop_verification' },
    });
    if (verifiedRecords.some((r) => (r.changes as any)?.field === field)) {
      throw new ConflictException();
    }

    const latestExtraction = await this.historyRepo.findOne({
      where: { manifestId, reason: 'extraction' },
      order: { createdAt: 'DESC' },
    });
    const reviewItem = (latestExtraction?.extractedData as any)?._human_review
      ?.find((r: any) => r.field === field);
    const originalText = reviewItem?.ocr_text ?? '';
    const originalBbox = reviewItem?.bbox as number[] | undefined;

    await this.historyRepo.save({
      manifestId,
      reason: 'manual_crop_verification',
      changes: { field, page, originalText, correctedText, originalBbox, adjustedBbox, createdBy: user.id },
    });

    const extractedData = { ...((manifest.extractedData as any) || {}) };
    this.setNestedField(extractedData, field, correctedText);
    await this.updateManifestUseCase.update(user, manifestId, { extractedData, humanVerified: false });

    // Call onCorrection on the extractor that produced this field
    const extractorType = manifest.textExtractorId;
    if (extractorType) {
      const extractorClass = this.extractorRegistry.get(extractorType);
      if (extractorClass?.metadata?.onCorrection) {
        const data: CorrectionData = {
          field,
          page,
          originalText,
          correctedText,
          bbox: (adjustedBbox ?? originalBbox) as [number, number, number, number] | undefined,
          confidence: reviewItem?.confidence as number | undefined,
          manifestId,
          userId: user.id,
        };
        await extractorClass.metadata.onCorrection(data);
      }
    }
  }

  private async cropFromFile(filePath: string | undefined, bbox: number[], fileType?: string, page?: number) {
    if (!filePath || bbox.length < 4) return null;
    try {
      const [x, y, w, h] = bbox;
      let source: Buffer | string = filePath;
      if (fileType === 'pdf') {
        const converted = await this.pdfToImageService.convertPdfPageToImage(
          filePath,
          page ?? 1,
        );
        source = converted.buffer;
      }
      const buffer = await sharp(source)
        .extract({ left: Math.round(x), top: Math.round(y), width: Math.round(w), height: Math.round(h) })
        .png()
        .toBuffer();
      return buffer.toString('base64');
    } catch { return null; }
  }

  private setNestedField(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
}
