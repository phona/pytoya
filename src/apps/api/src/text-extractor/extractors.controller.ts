import { Controller, Get } from '@nestjs/common';
import { TextExtractorRegistry } from './text-extractor.registry';

@Controller('extractors')
export class ExtractorsController {
  constructor(private readonly registry: TextExtractorRegistry) {}

  @Get()
  getExtractors() {
    return this.registry.getAll().map(({ type, metadata }) => ({
      type,
      configSchema: metadata.configSchema,
      promptContribution: metadata.promptContribution,
    }));
  }
}
