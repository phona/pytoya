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
import { CheckPolicies } from '../auth/casl/check-policies.decorator';
import { APP_ACTIONS, APP_SUBJECTS } from '../auth/casl/casl.types';
import { PoliciesGuard } from '../auth/casl/policies.guard';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('extractors')
export class ExtractorsController {
  constructor(
    private readonly extractorsService: ExtractorsService,
    private readonly extractorRegistry: TextExtractorRegistry,
    private readonly extractorCostService: ExtractorCostService,
  ) {}

  private getSecretKeys(extractorType: string): string[] {
    const extractor = this.extractorRegistry.get(extractorType);
    const schema = extractor?.metadata?.paramsSchema;
    if (!schema) {
      return [];
    }
    return Object.entries(schema)
      .filter(([, def]) => Boolean((def as { secret?: boolean }).secret))
      .map(([key]) => key);
  }

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
      ExtractorResponseDto.fromEntity(extractor, usageCounts[extractor.id] ?? 0, {
        secretKeys: this.getSecretKeys(extractor.extractorType),
      }),
    );
  }

  @Post()
  @CheckPolicies((ability) => ability.can(APP_ACTIONS.MANAGE, APP_SUBJECTS.EXTRACTOR))
  async create(@Body() body: CreateExtractorDto) {
    const extractor = await this.extractorsService.create(body);
    return ExtractorResponseDto.fromEntity(extractor, 0, {
      secretKeys: this.getSecretKeys(extractor.extractorType),
    });
  }

  @Get('cost-summaries')
  async costSummaries(@Query('ids') ids?: string): Promise<ExtractorCostSummaryDto[]> {
    const extractorIds = (ids ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const extractors = await this.extractorsService.findAll();
    const filtered = extractorIds.length > 0
      ? extractors.filter((extractor) => extractorIds.includes(extractor.id))
      : extractors;

    return this.extractorCostService.getCostSummaries(filtered);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const extractor = await this.extractorsService.findOne(id);
    const usageCounts = await this.extractorsService.getUsageCounts();
    return ExtractorResponseDto.fromEntity(extractor, usageCounts[id] ?? 0, {
      secretKeys: this.getSecretKeys(extractor.extractorType),
    });
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(APP_ACTIONS.MANAGE, APP_SUBJECTS.EXTRACTOR))
  async update(@Param('id') id: string, @Body() body: UpdateExtractorDto) {
    const extractor = await this.extractorsService.update(id, body);
    const usageCounts = await this.extractorsService.getUsageCounts();
    return ExtractorResponseDto.fromEntity(extractor, usageCounts[id] ?? 0, {
      secretKeys: this.getSecretKeys(extractor.extractorType),
    });
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(APP_ACTIONS.MANAGE, APP_SUBJECTS.EXTRACTOR))
  async remove(@Param('id') id: string) {
    const extractor = await this.extractorsService.remove(id);
    return ExtractorResponseDto.fromEntity(extractor, 0, {
      secretKeys: this.getSecretKeys(extractor.extractorType),
    });
  }

  @Post(':id/test')
  @CheckPolicies((ability) => ability.can(APP_ACTIONS.MANAGE, APP_SUBJECTS.EXTRACTOR))
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
