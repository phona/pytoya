import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExtractorEntity } from '../entities/extractor.entity';
import { LlmModule } from '../llm/llm.module';
import { PdfToImageModule } from '../pdf-to-image/pdf-to-image.module';
import { ExtractorRepository } from '../extractors/extractor.repository';
import { TextExtractorFactory } from './text-extractor.factory';
import { TextExtractorRegistry } from './text-extractor.registry';
import { TextExtractorService } from './text-extractor.service';

@Module({
  imports: [
    ConfigModule,
    LlmModule,
    PdfToImageModule,
    TypeOrmModule.forFeature([ExtractorEntity]),
  ],
  providers: [
    ExtractorRepository,
    TextExtractorFactory,
    TextExtractorRegistry,
    TextExtractorService,
  ],
  exports: [
    ExtractorRepository,
    TextExtractorFactory,
    TextExtractorRegistry,
    TextExtractorService,
  ],
})
export class TextExtractorModule {}
