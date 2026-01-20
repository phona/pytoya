import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExtractorsService } from './extractors.service';
import { CreateExtractorDto } from './dto/create-extractor.dto';
import { UpdateExtractorDto } from './dto/update-extractor.dto';
import { ExtractorResponseDto } from './dto/extractor-response.dto';
import { TestExtractorResponseDto } from './dto/test-extractor.dto';
import { TextExtractorRegistry } from '../text-extractor/text-extractor.registry';
import { ExtractorTypeDto } from './dto/extractor-type.dto';
import { ExtractorPresetDto } from './dto/extractor-preset.dto';
import { EXTRACTOR_PRESETS } from './extractor-presets';
import { ExtractorCostService } from './extractor-cost.service';
import { ExtractorCostSummaryDto } from './dto/extractor-cost-summary.dto';

@UseGuards(JwtAuthGuard)
@Controller('extractors')
export class ExtractorsController {
  constructor(
    private readonly extractorsService: ExtractorsService,
    private readonly extractorRegistry: TextExtractorRegistry,
    private readonly extractorCostService: ExtractorCostService,
  ) {}

  @Get('types')
  listTypes(): ExtractorTypeDto[] {
    return this.extractorRegistry.list().map((metadata) => ({
      id: metadata.id,
      name: metadata.name,
      description: metadata.description,
      version: metadata.version,
      category: metadata.category,
      paramsSchema: metadata.paramsSchema,
      supportedFormats: metadata.supportedFormats,
      pricingSchema: metadata.pricingSchema,
    }));
  }

  @Get('presets')
  listPresets(): ExtractorPresetDto[] {
    return EXTRACTOR_PRESETS;
  }

  @Get()
  async list(@Query('extractorType') extractorType?: string, @Query('isActive') isActive?: string) {
    const filters = {
      extractorType: extractorType || undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    };
    const [extractors, usageCounts] = await Promise.all([
      this.extractorsService.findAll(filters),
      this.extractorsService.getUsageCounts(),
    ]);

    return extractors.map((extractor) =>
      ExtractorResponseDto.fromEntity(extractor, usageCounts[extractor.id] ?? 0),
    );
  }

  @Post()
  async create(@Body() body: CreateExtractorDto) {
    const extractor = await this.extractorsService.create(body);
    return ExtractorResponseDto.fromEntity(extractor, 0);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const extractor = await this.extractorsService.findOne(id);
    const usageCounts = await this.extractorsService.getUsageCounts();
    return ExtractorResponseDto.fromEntity(extractor, usageCounts[id] ?? 0);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateExtractorDto) {
    const extractor = await this.extractorsService.update(id, body);
    const usageCounts = await this.extractorsService.getUsageCounts();
    return ExtractorResponseDto.fromEntity(extractor, usageCounts[id] ?? 0);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const extractor = await this.extractorsService.remove(id);
    return ExtractorResponseDto.fromEntity(extractor, 0);
  }

  @Post(':id/test')
  async test(@Param('id') id: string): Promise<TestExtractorResponseDto> {
    const result = await this.extractorsService.testConnection(id);
    return {
      ok: result.ok,
      message: result.message,
      latencyMs: result.latencyMs,
    };
  }

  @Get(':id/cost-summary')
  async costSummary(@Param('id') id: string): Promise<ExtractorCostSummaryDto> {
    const extractor = await this.extractorsService.findOne(id);
    return this.extractorCostService.getCostSummary(extractor);
  }
}
