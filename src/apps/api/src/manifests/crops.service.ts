import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sharp from 'sharp';
import { Repository } from 'typeorm';

import { ExtractionHistoryEntity } from '../entities/extraction-history.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { UserEntity } from '../entities/user.entity';
import { UpdateManifestUseCase } from '../usecases/update-manifest.usecase';
import type { PendingCropItemDto, PendingCropsResponseDto } from './dto/pending-crops.dto';

@Injectable()
export class CropsService {
  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepo: Repository<ManifestEntity>,
    @InjectRepository(ExtractionHistoryEntity)
    private readonly historyRepo: Repository<ExtractionHistoryEntity>,
    private readonly updateManifestUseCase: UpdateManifestUseCase,
  ) {}

  async getPendingCrops(manifestId: number, threshold: number): Promise<PendingCropsResponseDto> {
    const manifest = await this.manifestRepo.findOne({ where: { id: manifestId } });
    if (!manifest) throw new NotFoundException();

    const latestExtraction = await this.historyRepo.findOne({
      where: { manifestId, reason: 'extraction' },
      order: { createdAt: 'DESC' },
    });
    if (!latestExtraction?.extractedData) return { items: [], total: 0 };

    const humanReview = (latestExtraction.extractedData as any)?._human_review ?? [];
    if (humanReview.length === 0) return { items: [], total: 0 };

    const verifiedRecords = await this.historyRepo.find({
      where: { manifestId, reason: 'manual_crop_verification' },
    });
    const verifiedFields = new Set(
      verifiedRecords.map((r) => (r.changes as any)?.field),
    );

    const pending = humanReview.filter(
      (item: any) => item.confidence < threshold && !verifiedFields.has(item.field),
    );

    const items: PendingCropItemDto[] = [];
    for (const item of pending) {
      const cropBase64 = await this.cropFromFile(manifest.storagePath, item.bbox);
      items.push({
        field: item.field,
        page: item.page,
        cropImage: cropBase64 ?? '',
        ocrText: item.ocr_text,
        confidence: item.confidence,
        reason: item.reason,
        bbox: item.bbox as number[],
      });
    }

    return { items, total: items.length };
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
  }

  private async cropFromFile(filePath: string | undefined, bbox: number[]) {
    if (!filePath || bbox.length < 4) return null;
    try {
      const [x, y, w, h] = bbox;
      const buffer = await sharp(filePath)
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
