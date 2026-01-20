import { HttpModule, HttpService } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OCR_AXIOS_INSTANCE } from './ocr.constants';
import { OcrService } from './ocr.service';
import { OcrCacheService } from './ocr-cache.service';
import { ManifestEntity } from '../entities/manifest.entity';

const DEFAULT_BASE_URL = 'http://localhost:8080';
const DEFAULT_TIMEOUT_MS = 120000;

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ManifestEntity]),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const baseUrl =
          configService.get<string>('paddleocr.baseUrl') ??
          DEFAULT_BASE_URL;
        const timeout = getNumberConfig(
          configService,
          'PADDLEOCR_TIMEOUT',
          DEFAULT_TIMEOUT_MS,
        );
        return {
          baseURL: normalizeBaseUrl(baseUrl),
          timeout,
        };
      },
    }),
  ],
  providers: [
    OcrService,
    OcrCacheService,
    {
      provide: OCR_AXIOS_INSTANCE,
      useFactory: (httpService: HttpService) =>
        httpService.axiosRef,
      inject: [HttpService],
    },
  ],
  exports: [OcrService, OcrCacheService],
})
export class OcrModule {}

const normalizeBaseUrl = (url: string): string =>
  url.replace(/\/+$/, '');

const getNumberConfig = (
  configService: ConfigService,
  key: string,
  defaultValue: number,
): number => {
  const raw = configService.get<string | number>(key);
  if (raw === undefined || raw === null) {
    return defaultValue;
  }
  const value =
    typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0
    ? value
    : defaultValue;
};
