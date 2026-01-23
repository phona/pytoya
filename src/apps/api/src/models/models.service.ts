import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import { ModelEntity } from '../entities/model.entity';
import { ModelPricing, ModelPricingHistoryEntry } from '../entities/model-pricing.types';
import { LlmService } from '../llm/llm.service';
import { adapterRegistry } from './adapters/adapter-registry';
import { AdapterCategory } from './adapters/adapter.interface';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { ModelPricingDto } from './dto/update-model-pricing.dto';

type ModelFilters = {
  category?: AdapterCategory;
  adapterType?: string;
  isActive?: boolean;
};

const MASKED_SECRET = '********';

@Injectable()
export class ModelsService {
  constructor(
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    private readonly llmService: LlmService,
  ) {}

  async create(input: CreateModelDto): Promise<ModelEntity> {
    this.ensureValidParameters(input.adapterType, input.parameters);
    const model = this.modelRepository.create({
      name: input.name,
      adapterType: input.adapterType,
      parameters: input.parameters,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    });
    const seededPricing = this.getDefaultPricingForModel(model);
    if (seededPricing) {
      model.pricing = {
        ...seededPricing,
        effectiveDate: new Date().toISOString(),
      } satisfies ModelPricing;
    }
    return this.modelRepository.save(model);
  }

  async findAll(filters: ModelFilters = {}): Promise<ModelEntity[]> {
    const where: FindOptionsWhere<ModelEntity> = {};
    if (filters.adapterType) {
      where.adapterType = filters.adapterType;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    let models = await this.modelRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (filters.category) {
      const allowedTypes = adapterRegistry
        .getAdaptersByCategory(filters.category)
        .map((schema) => schema.type);
      models = models.filter((model) => allowedTypes.includes(model.adapterType));
    }

    return models;
  }

  async findOne(id: string): Promise<ModelEntity> {
    const model = await this.modelRepository.findOne({
      where: { id },
    });
    if (!model) {
      throw new NotFoundException(`Model ${id} not found`);
    }
    return model;
  }

  async update(id: string, input: UpdateModelDto): Promise<ModelEntity> {
    const model = await this.findOne(id);
    const nextAdapterType = input.adapterType ?? model.adapterType;
    const adapterTypeChanged = nextAdapterType !== model.adapterType;

    if (input.adapterType && input.parameters === undefined) {
      throw new BadRequestException(
        'Parameters are required when changing adapter type',
      );
    }

    let nextParameters = model.parameters;
    if (input.parameters !== undefined) {
      const schema = adapterRegistry.getSchema(nextAdapterType);
      const sanitized: Record<string, unknown> = { ...input.parameters };

      for (const [key, definition] of Object.entries(schema?.parameters ?? {})) {
        if (!definition.secret) continue;
        if (sanitized[key] !== MASKED_SECRET) continue;

        if (!adapterTypeChanged && model.parameters[key] !== undefined) {
          delete sanitized[key];
          continue;
        }

        // Adapter type changed or no existing value to fall back to:
        // force callers to send an actual secret (not the masked placeholder).
        delete sanitized[key];
      }

      nextParameters = adapterTypeChanged
        ? sanitized
        : { ...model.parameters, ...sanitized };

      this.ensureValidParameters(nextAdapterType, nextParameters);
    }

    Object.assign(model, {
      name: input.name ?? model.name,
      adapterType: nextAdapterType,
      parameters: input.parameters !== undefined ? nextParameters : model.parameters,
      description: input.description ?? model.description,
      isActive: input.isActive ?? model.isActive,
    });

    if (input.pricing) {
      this.ensurePricingPayload(input.pricing);
      this.ensurePricingCategory(model, input.pricing);

      const now = new Date().toISOString();
      const nextPricing = this.mergePricing(model.pricing, input.pricing, now);
      const history = this.appendPricingHistory(
        model.pricing,
        model.pricingHistory,
        now,
      );

      Object.assign(model, {
        pricing: nextPricing,
        pricingHistory: history,
      });
    }

    return this.modelRepository.save(model);
  }

  async updatePricing(
    id: string,
    pricing: ModelPricingDto,
  ): Promise<ModelEntity> {
    return this.update(id, { pricing });
  }

  async seedDefaultPricing(): Promise<{
    updated: number;
    skipped: number;
  }> {
    const models = await this.modelRepository.find();
    let updated = 0;
    let skipped = 0;
    const updatedModels: ModelEntity[] = [];

    for (const model of models) {
      const next = this.getDefaultPricingForModel(model);
      if (!next) {
        skipped += 1;
        continue;
      }

      const hasPricing = this.hasMeaningfulPricing(model.pricing);
      if (hasPricing) {
        skipped += 1;
        continue;
      }

      const now = new Date().toISOString();
      const previousPricing = model.pricing;
      const previousHistory = model.pricingHistory;
      model.pricingHistory = this.appendPricingHistory(
        previousPricing,
        previousHistory,
        now,
      );
      model.pricing = {
        ...next,
        effectiveDate: now,
      } satisfies ModelPricing;
      updated += 1;
      updatedModels.push(model);
    }

    if (updatedModels.length > 0) {
      await this.modelRepository.save(updatedModels);
    }

    return { updated, skipped };
  }

  async remove(id: string): Promise<ModelEntity> {
    const model = await this.findOne(id);
    return this.modelRepository.remove(model);
  }

  async testConnection(id: string): Promise<{
    ok: boolean;
    message: string;
    model?: string;
    latencyMs?: number;
  }> {
    const model = await this.findOne(id);
    const schema = adapterRegistry.getSchema(model.adapterType);
    if (!schema) {
      throw new BadRequestException(
        `Unknown adapter type: ${model.adapterType}`,
      );
    }

    const start = Date.now();
    if (schema.category === 'ocr') {
      return {
        ok: false,
        message: 'OCR models are deprecated. Configure text extractors instead.',
        latencyMs: Date.now() - start,
      };
    }

    const providerConfig = this.buildLlmProviderConfig(
      model.adapterType,
      model.parameters,
    );
    try {
      const completion = await this.llmService.createChatCompletion(
        [{ role: 'user', content: 'ping' }],
        {
          maxTokens: 4,
          temperature: 0,
        },
        providerConfig,
      );
      return {
        ok: true,
        message: 'LLM connection ok',
        model: completion.model,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        message,
        latencyMs: Date.now() - start,
      };
    }
  }

  private ensureValidParameters(
    adapterType: string,
    parameters: Record<string, unknown>,
  ): void {
    const result = adapterRegistry.validateParameters(
      adapterType,
      parameters,
    );
    if (!result.valid) {
      throw new BadRequestException(
        result.errors.join('; ') || 'Invalid adapter parameters',
      );
    }
  }

  private ensurePricingPayload(pricing: ModelPricingDto): void {
    if (!pricing.ocr && !pricing.llm) {
      throw new BadRequestException('Pricing must include OCR or LLM rates');
    }
  }

  private ensurePricingCategory(
    model: ModelEntity,
    pricing: ModelPricingDto,
  ): void {
    const schema = adapterRegistry.getSchema(model.adapterType);
    const category = schema?.category;
    if (category === 'ocr' && pricing.llm) {
      throw new BadRequestException('OCR models cannot accept LLM pricing');
    }
    if (category === 'llm' && pricing.ocr) {
      throw new BadRequestException('LLM models cannot accept OCR pricing');
    }
  }

  private mergePricing(
    current: ModelPricing,
    next: ModelPricingDto,
    effectiveDate: string,
  ): ModelPricing {
    return {
      effectiveDate,
      ocr: next.ocr ? { ...current.ocr, ...next.ocr } : current.ocr,
      llm: next.llm ? { ...current.llm, ...next.llm } : current.llm,
    };
  }

  private appendPricingHistory(
    pricing: ModelPricing | undefined,
    pricingHistory: ModelPricingHistoryEntry[] | undefined,
    endDate: string,
  ): ModelPricingHistoryEntry[] {
    const history = Array.isArray(pricingHistory)
      ? [...pricingHistory]
      : [];
    if (!pricing || !this.hasMeaningfulPricing(pricing)) {
      return history;
    }
    history.push({
      ...pricing,
      endDate,
    });
    return history;
  }

  private hasMeaningfulPricing(pricing: ModelPricing | undefined): boolean {
    if (!pricing) {
      return false;
    }
    const ocr = pricing.ocr?.pricePerPage ?? 0;
    const llmInput = pricing.llm?.inputPrice ?? 0;
    const llmOutput = pricing.llm?.outputPrice ?? 0;
    return ocr > 0 || llmInput > 0 || llmOutput > 0;
  }

  private getDefaultPricingForModel(model: ModelEntity): ModelPricing | null {
    const name = model.name.toLowerCase();
    const adapterType = model.adapterType.toLowerCase();

    if (adapterType === 'paddlex' || name.includes('paddleocr')) {
      return {
        effectiveDate: new Date().toISOString(),
        ocr: {
          pricePerPage: 0.001,
          currency: 'USD',
        },
      };
    }

    if (name.includes('gpt-4o-mini')) {
      return {
        effectiveDate: new Date().toISOString(),
        llm: {
          inputPrice: 0.15,
          outputPrice: 0.6,
          currency: 'USD',
        },
      };
    }

    if (name.includes('gpt-4o')) {
      return {
        effectiveDate: new Date().toISOString(),
        llm: {
          inputPrice: 2.5,
          outputPrice: 10.0,
          currency: 'USD',
        },
      };
    }

    if (name.includes('claude') && name.includes('3.5')) {
      return {
        effectiveDate: new Date().toISOString(),
        llm: {
          inputPrice: 3.0,
          outputPrice: 15.0,
          currency: 'USD',
        },
      };
    }

    if (name.includes('qwen')) {
      return {
        effectiveDate: new Date().toISOString(),
        llm: {
          inputPrice: 0.1,
          outputPrice: 0.1,
          currency: 'USD',
        },
      };
    }

    if (name.includes('local') || name.includes('llama')) {
      return {
        effectiveDate: new Date().toISOString(),
        llm: {
          inputPrice: 0,
          outputPrice: 0,
          currency: 'USD',
        },
      };
    }

    return null;
  }

  private getStringParam(
    parameters: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = parameters[key];
    return typeof value === 'string' ? value : undefined;
  }

  private getNumberParam(
    parameters: Record<string, unknown>,
    key: string,
  ): number | undefined {
    const value = parameters[key];
    return typeof value === 'number' ? value : undefined;
  }

  private buildLlmProviderConfig(
    adapterType: string,
    parameters: Record<string, unknown>,
  ): {
    type?: string;
    baseUrl?: string;
    apiKey?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    supportsVision?: boolean;
    supportsStructuredOutput?: boolean;
  } {
    return {
      type: adapterType,
      baseUrl: this.getStringParam(parameters, 'baseUrl'),
      apiKey: this.getStringParam(parameters, 'apiKey'),
      modelName: this.getStringParam(parameters, 'modelName'),
      temperature: this.getNumberParam(parameters, 'temperature'),
      maxTokens: this.getNumberParam(parameters, 'maxTokens'),
      supportsVision: Boolean(parameters.supportsVision),
      supportsStructuredOutput: Boolean(parameters.supportsStructuredOutput),
    };
  }
}
