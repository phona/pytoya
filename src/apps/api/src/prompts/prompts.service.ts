import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PromptEntity } from '../entities/prompt.entity';
import {
  RE_EXTRACT_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
} from './constants/system-prompts.constant';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { PromptNotFoundException } from './exceptions/prompt-not-found.exception';

@Injectable()
export class PromptsService {
  constructor(
    @InjectRepository(PromptEntity)
    private readonly promptRepository: Repository<PromptEntity>,
  ) {}

  async create(input: CreatePromptDto): Promise<PromptEntity> {
    const prompt = this.promptRepository.create({
      ...input,
      variables: input.variables ?? null,
    });
    return this.promptRepository.save(prompt);
  }

  async findAll(): Promise<PromptEntity[]> {
    return this.promptRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<PromptEntity> {
    const prompt = await this.promptRepository.findOne({
      where: { id },
    });

    if (!prompt) {
      throw new PromptNotFoundException(id);
    }

    return prompt;
  }

  async update(
    id: number,
    input: UpdatePromptDto,
  ): Promise<PromptEntity> {
    const prompt = await this.findOne(id);
    Object.assign(prompt, {
      ...input,
      variables:
        input.variables === undefined
          ? prompt.variables
          : input.variables ?? null,
    });

    return this.promptRepository.save(prompt);
  }

  async remove(id: number): Promise<PromptEntity> {
    const prompt = await this.findOne(id);
    return this.promptRepository.remove(prompt);
  }

  getSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  getReExtractSystemPrompt(): string {
    return RE_EXTRACT_SYSTEM_PROMPT;
  }
}
