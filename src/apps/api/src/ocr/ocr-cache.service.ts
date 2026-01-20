import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ManifestEntity } from '../entities/manifest.entity';
import { OcrResultDto } from '../manifests/dto/ocr-result.dto';

interface CachedOcrResult {
  manifestId: number;
  ocrResult: OcrResultDto;
  qualityScore: number;
  processedAt: Date;
  pageCount: number;
}

@Injectable()
export class OcrCacheService {
  private readonly cachePrefix = 'ocr:';
  private readonly defaultTTL = 3600; // 1 hour in seconds

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get cached OCR result for a manifest
   */
  async getCachedOcrResult(manifestId: number): Promise<CachedOcrResult | null> {
    const cacheKey = `${this.cachePrefix}${manifestId}`;
    const cached = await this.cacheManager.get<CachedOcrResult>(cacheKey);

    if (cached) {
      return cached;
    }

    // Check database for OCR result
    const manifest = await this.manifestRepository.findOne({
      where: { id: manifestId },
      select: ['id', 'ocrResult', 'ocrProcessedAt', 'ocrQualityScore'],
    });

    if (!manifest?.ocrResult) {
      return null;
    }

    const ocrResult = manifest.ocrResult as unknown as OcrResultDto;
    const pageCount = ocrResult.document?.pages || 0;

    const result: CachedOcrResult = {
      manifestId,
      ocrResult,
      qualityScore: manifest.ocrQualityScore || 0,
      processedAt: manifest.ocrProcessedAt || new Date(),
      pageCount,
    };

    // Cache the result
    await this.setCachedOcrResult(manifestId, result);

    return result;
  }

  /**
   * Set cached OCR result for a manifest
   */
  async setCachedOcrResult(
    manifestId: number,
    data: CachedOcrResult,
  ): Promise<void> {
    const cacheKey = `${this.cachePrefix}${manifestId}`;
    const ttl = this.configService.get<number>('cache.ocr.ttl', this.defaultTTL);
    await this.cacheManager.set(cacheKey, data, ttl);
  }

  /**
   * Invalidate cache for a specific manifest
   */
  async invalidateCache(manifestId: number): Promise<void> {
    const cacheKey = `${this.cachePrefix}${manifestId}`;
    await this.cacheManager.del(cacheKey);
  }

  /**
   * Bulk cache OCR results for multiple manifests
   */
  async bulkCacheOcrResults(manifestIds: number[]): Promise<void> {
    const manifests = await this.manifestRepository.find({
      where: manifestIds.map((id) => ({ id } as any)),
      select: ['id', 'ocrResult', 'ocrProcessedAt', 'ocrQualityScore'],
    });

    const cachePromises = manifests
      .filter((m) => m.ocrResult)
      .map((manifest) => {
        const ocrResult = manifest.ocrResult as unknown as OcrResultDto;
        const pageCount = ocrResult.document?.pages || 0;

        const data: CachedOcrResult = {
          manifestId: manifest.id,
          ocrResult,
          qualityScore: manifest.ocrQualityScore || 0,
          processedAt: manifest.ocrProcessedAt || new Date(),
          pageCount,
        };

        return this.setCachedOcrResult(manifest.id, data);
      });

    await Promise.all(cachePromises);
  }

  /**
   * Get page count from cached or database OCR result
   */
  async getPageCount(manifestId: number): Promise<number> {
    const cached = await this.getCachedOcrResult(manifestId);
    if (cached) {
      return cached.pageCount;
    }

    const manifest = await this.manifestRepository.findOne({
      where: { id: manifestId },
      select: ['ocrResult'],
    });

    if (!manifest?.ocrResult) {
      return 0;
    }

    const ocrResult = manifest.ocrResult as unknown as OcrResultDto;
    return ocrResult.document?.pages || 0;
  }

  /**
   * Warm up cache for frequently accessed manifests
   */
  async warmupCache(limit: number = 100): Promise<number> {
    // Get recently accessed manifests with OCR results
    const manifests = await this.manifestRepository
      .createQueryBuilder('manifest')
      .where('manifest.ocrResult IS NOT NULL')
      .orderBy('manifest.updatedAt', 'DESC')
      .take(limit)
      .select(['manifest.id', 'manifest.ocrResult', 'manifest.ocrProcessedAt', 'manifest.ocrQualityScore'])
      .getMany();

    let cachedCount = 0;

    for (const manifest of manifests) {
      try {
        const ocrResult = manifest.ocrResult as unknown as OcrResultDto;
        const pageCount = ocrResult.document?.pages || 0;

        const data: CachedOcrResult = {
          manifestId: manifest.id,
          ocrResult,
          qualityScore: manifest.ocrQualityScore || 0,
          processedAt: manifest.ocrProcessedAt || new Date(),
          pageCount,
        };

        await this.setCachedOcrResult(manifest.id, data);
        cachedCount++;
      } catch (error) {
        // Skip problematic manifests but continue with others
        console.error(`Failed to cache manifest ${manifest.id}:`, error);
      }
    }

    return cachedCount;
  }

  /**
   * Clear all OCR cache
   */
  async clearAllCache(): Promise<void> {
    // Note: This requires a cache manager that supports key iteration
    // For Redis, we can use pattern matching to delete all OCR keys
    // For in-memory cache, we might need to restart the service
    const cacheStore = (this.cacheManager as any).store;

    if (cacheStore?.keys) {
      const keys = await cacheStore.keys();
      const ocrKeys = keys.filter((key: string) => key.startsWith(this.cachePrefix));

      await Promise.all(
        ocrKeys.map((key: string) => this.cacheManager.del(key)),
      );
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    size: number;
    manifestsWithOcr: number;
    cacheHitRate: number;
  }> {
    const manifestsCount = await this.manifestRepository.count({
      where: { ocrResult: { $ne: null } as any },
    });

    let cachedCount = 0;
    const cacheStore = (this.cacheManager as any).store;

    if (cacheStore?.keys) {
      const keys = await cacheStore.keys();
      cachedCount = keys.filter((key: string) => key.startsWith(this.cachePrefix)).length;
    }

    return {
      size: cachedCount,
      manifestsWithOcr: manifestsCount,
      cacheHitRate: manifestsCount > 0 ? (cachedCount / manifestsCount) * 100 : 0,
    };
  }
}
