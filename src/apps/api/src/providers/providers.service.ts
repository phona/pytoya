import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { ProviderEntity } from '../entities/provider.entity';
import { LlmService } from '../llm/llm.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderNotFoundException } from './exceptions/provider-not-found.exception';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    private readonly llmService: LlmService,
  ) {}

  async create(input: CreateProviderDto): Promise<ProviderEntity> {
    const provider = this.providerRepository.create(input);
    const saved = await this.providerRepository.save(provider);

    if (input.isDefault) {
      await this.setDefaultProvider(saved.id);
      return this.findOne(saved.id);
    }

    return saved;
  }

  async findAll(): Promise<ProviderEntity[]> {
    return this.providerRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ProviderEntity> {
    const provider = await this.providerRepository.findOne({
      where: { id },
    });

    if (!provider) {
      throw new ProviderNotFoundException(id);
    }

    return provider;
  }

  async update(
    id: number,
    input: UpdateProviderDto,
  ): Promise<ProviderEntity> {
    const provider = await this.findOne(id);
    Object.assign(provider, input);
    const saved = await this.providerRepository.save(provider);

    if (input.isDefault) {
      await this.setDefaultProvider(saved.id);
      return this.findOne(saved.id);
    }

    return saved;
  }

  async remove(id: number): Promise<ProviderEntity> {
    const provider = await this.findOne(id);
    return this.providerRepository.remove(provider);
  }

  async testConnection(id: number): Promise<{
    ok: boolean;
    model?: string;
    error?: string;
  }> {
    const provider = await this.findOne(id);

    try {
      const result = await this.llmService.createChatCompletion(
        [{ role: 'user', content: 'ping' }],
        {
          maxTokens: 4,
          temperature: 0,
        },
        {
          type: provider.type,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          modelName: provider.modelName,
          temperature: provider.temperature,
          maxTokens: provider.maxTokens,
        },
      );

      return { ok: true, model: result.model };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  }

  private async setDefaultProvider(providerId: number): Promise<void> {
    await this.providerRepository.update(
      { id: Not(providerId) },
      { isDefault: false },
    );
    await this.providerRepository.update(
      { id: providerId },
      { isDefault: true },
    );
  }
}
