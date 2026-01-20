import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { execFile } from 'child_process';
import { promisify } from 'util';

import { ExtractorEntity } from '../entities/extractor.entity';
import { ProjectEntity } from '../entities/project.entity';
import { LlmService } from '../llm/llm.service';
import { TextExtractorRegistry } from '../text-extractor/text-extractor.registry';
import { PricingConfig } from '../text-extractor/types/extractor.types';
import { ExtractorRepository } from './extractor.repository';
import { CreateExtractorDto } from './dto/create-extractor.dto';
import { UpdateExtractorDto } from './dto/update-extractor.dto';

const execFileAsync = promisify(execFile);

@Injectable()
export class ExtractorsService {
  constructor(
    private readonly extractorRepository: ExtractorRepository,
    private readonly extractorRegistry: TextExtractorRegistry,
    private readonly llmService: LlmService,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
  ) {}

  async create(input: CreateExtractorDto): Promise<ExtractorEntity> {
    this.ensureExtractorType(input.extractorType);
    this.validateConfig(input.extractorType, input.config ?? {});

    return this.extractorRepository.create({
      name: input.name,
      description: input.description ?? null,
      extractorType: input.extractorType,
      config: this.withDefaultPricing(input.config),
      isActive: input.isActive ?? true,
    });
  }

  async findAll(filters?: { extractorType?: string; isActive?: boolean }): Promise<ExtractorEntity[]> {
    return this.extractorRepository.findAll(filters);
  }

  async findOne(id: string): Promise<ExtractorEntity> {
    const extractor = await this.extractorRepository.findOne(id);
    if (!extractor) {
      throw new NotFoundException(`Extractor ${id} not found`);
    }
    return extractor;
  }

  async update(id: string, input: UpdateExtractorDto): Promise<ExtractorEntity> {
    const extractor = await this.findOne(id);
    const nextType = input.extractorType ?? extractor.extractorType;

    if (input.extractorType && input.config === undefined) {
      throw new BadRequestException('Config is required when changing extractor type');
    }

    if (input.config) {
      this.ensureExtractorType(nextType);
      this.validateConfig(nextType, input.config);
    }

    const nextConfig = input.config ? this.withDefaultPricing(input.config) : extractor.config;

    return this.extractorRepository.update(id, {
      name: input.name ?? extractor.name,
      description: input.description ?? extractor.description,
      extractorType: nextType,
      config: nextConfig,
      isActive: input.isActive ?? extractor.isActive,
    });
  }

  async remove(id: string): Promise<ExtractorEntity> {
    return this.extractorRepository.remove(id);
  }

  async getUsageCounts(): Promise<Record<string, number>> {
    const rows = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.textExtractorId', 'extractorId')
      .addSelect('COUNT(*)', 'count')
      .where('project.textExtractorId IS NOT NULL')
      .groupBy('project.textExtractorId')
      .getRawMany<{ extractorId: string; count: string }>();

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.extractorId] = Number(row.count) || 0;
      return acc;
    }, {});
  }

  async testConnection(id: string): Promise<{ ok: boolean; message: string; latencyMs?: number }>
  {
    const extractor = await this.findOne(id);
    const start = Date.now();

    switch (extractor.extractorType) {
      case 'paddleocr':
        return this.testPaddle(extractor, start);
      case 'vision-llm':
        return this.testVision(extractor, start);
      case 'tesseract':
        return this.testTesseract(extractor, start);
      default:
        return { ok: false, message: `Unsupported extractor type ${extractor.extractorType}` };
    }
  }

  private async testPaddle(extractor: ExtractorEntity, start: number) {
    const baseUrl = (extractor.config?.baseUrl as string | undefined) ?? 'http://localhost:8080';
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/`, { method: 'GET' });
      const ok = response.status < 500;
      return {
        ok,
        message: ok ? 'OCR connection ok' : `OCR connection failed (${response.status})`,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'OCR connection failed',
        latencyMs: Date.now() - start,
      };
    }
  }

  private async testVision(extractor: ExtractorEntity, start: number) {
    const config = extractor.config ?? {};
    try {
      const completion = await this.llmService.createChatCompletion(
        [{ role: 'user', content: 'ping' }],
        { maxTokens: 4, temperature: 0, apiKey: config.apiKey as string | undefined },
        {
          type: 'openai',
          baseUrl: config.baseUrl as string | undefined,
          apiKey: config.apiKey as string | undefined,
          modelName: config.model as string | undefined,
        },
      );
      return {
        ok: true,
        message: `LLM connection ok (${completion.model ?? config.model ?? 'unknown'})`,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'LLM connection failed',
        latencyMs: Date.now() - start,
      };
    }
  }

  private async testTesseract(extractor: ExtractorEntity, start: number) {
    const binaryPath = (extractor.config?.binaryPath as string | undefined) ?? 'tesseract';
    try {
      const { stdout } = await execFileAsync(binaryPath, ['--version']);
      return {
        ok: true,
        message: stdout ? stdout.split('\n')[0] : 'Tesseract ok',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Tesseract not available',
        latencyMs: Date.now() - start,
      };
    }
  }

  private ensureExtractorType(type: string) {
    if (!this.extractorRegistry.get(type)) {
      throw new BadRequestException(`Unknown extractor type: ${type}`);
    }
  }

  private validateConfig(type: string, config: Record<string, unknown>) {
    const result = this.extractorRegistry.validateConfig(type, config);
    if (!result.valid) {
      throw new BadRequestException(result.errors.join('; ') || 'Invalid extractor config');
    }
    this.validatePricing(config.pricing as PricingConfig | undefined);
  }

  private validatePricing(pricing?: PricingConfig): void {
    const resolved = pricing ?? { mode: 'none', currency: 'USD' };

    if (!resolved.currency || typeof resolved.currency !== 'string') {
      throw new BadRequestException('Pricing currency is required');
    }

    if (resolved.mode === 'token') {
      if (resolved.inputPricePerMillionTokens === undefined) {
        throw new BadRequestException('Token pricing requires inputPricePerMillionTokens');
      }
      if (resolved.outputPricePerMillionTokens === undefined) {
        throw new BadRequestException('Token pricing requires outputPricePerMillionTokens');
      }
    }

    if (resolved.mode === 'page' && resolved.pricePerPage === undefined) {
      throw new BadRequestException('Page pricing requires pricePerPage');
    }

    if (resolved.mode === 'fixed' && resolved.fixedCost === undefined) {
      throw new BadRequestException('Fixed pricing requires fixedCost');
    }
  }

  private withDefaultPricing(config?: Record<string, unknown>) {
    const next = { ...(config ?? {}) };
    if (!next.pricing) {
      next.pricing = { mode: 'none', currency: 'USD' };
    }
    return next;
  }
}
