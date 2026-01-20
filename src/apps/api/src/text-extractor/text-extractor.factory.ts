import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LlmService } from '../llm/llm.service';
import { TextExtractorRegistry } from './text-extractor.registry';
import { TextExtractorConfig, TextExtractorClass, TextExtractor } from './types/extractor.types';

@Injectable()
export class TextExtractorFactory {
  private readonly logger = new Logger(TextExtractorFactory.name);
  private readonly cache = new Map<string, { hash: string; instance: TextExtractor }>();

  constructor(
    private readonly registry: TextExtractorRegistry,
    private readonly configService: ConfigService,
    private readonly llmService: LlmService,
  ) {}

  createInstance(
    extractorType: string,
    config: TextExtractorConfig,
    cacheKey?: string,
  ): TextExtractor {
    const extractorClass = this.registry.get(extractorType);
    if (!extractorClass) {
      throw new Error(`Unknown extractor type: ${extractorType}`);
    }

    const hash = this.stableStringify(config ?? {});
    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.hash === hash) {
        return cached.instance;
      }
    }

    const instance = this.buildInstance(extractorClass, config);
    if (cacheKey) {
      this.cache.set(cacheKey, { hash, instance });
    }

    return instance;
  }

  private buildInstance(
    extractorClass: TextExtractorClass,
    config: TextExtractorConfig,
  ): TextExtractor {
    const deps = {
      configService: this.configService,
      llmService: this.llmService,
    };

    try {
      return new extractorClass(config, deps);
    } catch (error) {
      this.logger.error(`Failed to create extractor ${extractorClass.metadata?.id}`, error as Error);
      throw error;
    }
  }

  private stableStringify(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => `${key}:${this.stableStringify(val)}`);
      return `{${entries.join(',')}}`;
    }
    return String(value);
  }
}
