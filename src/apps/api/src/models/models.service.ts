import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import { ModelEntity } from '../entities/model.entity';
import { LlmService } from '../llm/llm.service';
import { OcrService } from '../ocr/ocr.service';
import { adapterRegistry } from './adapters/adapter-registry';
import { AdapterCategory } from './adapters/adapter.interface';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';

type ModelFilters = {
  category?: AdapterCategory;
  adapterType?: string;
  isActive?: boolean;
};

@Injectable()
export class ModelsService {
  constructor(
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    private readonly llmService: LlmService,
    private readonly ocrService: OcrService,
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

    if (input.adapterType && input.parameters === undefined) {
      throw new BadRequestException(
        'Parameters are required when changing adapter type',
      );
    }

    if (input.parameters) {
      this.ensureValidParameters(nextAdapterType, input.parameters);
    }

    Object.assign(model, {
      name: input.name ?? model.name,
      adapterType: nextAdapterType,
      parameters: input.parameters ?? model.parameters,
      description: input.description ?? model.description,
      isActive: input.isActive ?? model.isActive,
    });

    return this.modelRepository.save(model);
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
      const baseUrl = this.getStringParam(model.parameters, 'baseUrl');
      const apiKey = this.getStringParam(model.parameters, 'apiKey');
      const timeoutMs = this.getNumberParam(model.parameters, 'timeout');
      const result = await this.ocrService.testConnection({
        baseUrl,
        apiKey,
        timeoutMs,
      });
      return {
        ok: result.ok,
        message: result.ok ? 'OCR connection ok' : result.error ?? 'OCR connection failed',
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
