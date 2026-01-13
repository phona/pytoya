import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as yaml from 'js-yaml';
import { Repository } from 'typeorm';

import { PromptEntity } from '../entities/prompt.entity';
import { INVOICE_YAML_SCHEMA } from './constants/invoice-schema.constant';
import {
  FEEDBACK_TEMPLATE,
  OCR_SECTION,
  PREVIOUS_RESULT_TEMPLATE,
  RE_EXTRACT_RETURN_INSTRUCTION,
  RETURN_YAML_INSTRUCTION,
} from './constants/prompt-templates.constant';
import {
  RE_EXTRACT_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
} from './constants/system-prompts.constant';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { PromptNotFoundException } from './exceptions/prompt-not-found.exception';
import { ExtractedData } from './types/prompts.types';

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

  buildExtractionPrompt(ocrMarkdown: string): string {
    const ocrSection = this.interpolateTemplate(OCR_SECTION, {
      markdown_text: ocrMarkdown,
    });
    const instruction = this.interpolateTemplate(
      RETURN_YAML_INSTRUCTION,
      {
        schema: INVOICE_YAML_SCHEMA,
      },
    );

    return `${ocrSection}

${instruction}`;
  }

  buildReExtractPrompt(
    ocrMarkdown: string,
    previousResult: ExtractedData,
    missingFields?: string[],
    errorMessage?: string,
  ): string {
    const errorStr = errorMessage ?? 'None';
    const missingFieldsStr = (missingFields ?? [])
      .map((field) => `  - ${field}`)
      .join('\n');

    const feedback = this.interpolateTemplate(FEEDBACK_TEMPLATE, {
      error: errorStr,
      missing_fields: missingFieldsStr,
    });

    const previousYaml = this.formatResultAsYaml(previousResult);
    const previousResultSection = this.interpolateTemplate(
      PREVIOUS_RESULT_TEMPLATE,
      {
        previous_yaml: previousYaml,
      },
    );

    const ocrSection = this.interpolateTemplate(OCR_SECTION, {
      markdown_text: ocrMarkdown,
    });
    const returnInstruction = this.interpolateTemplate(
      RE_EXTRACT_RETURN_INSTRUCTION,
      {
        schema: INVOICE_YAML_SCHEMA,
      },
    );

    return `${feedback}

${ocrSection}

${previousResultSection}

${returnInstruction}`;
  }

  formatResultAsYaml(result: ExtractedData): string {
    return yaml.dump(result, {
      sortKeys: false,
      lineWidth: -1,
    });
  }

  getInvoiceSchema(): string {
    return INVOICE_YAML_SCHEMA;
  }

  private interpolateTemplate(
    template: string,
    values: Record<string, string>,
  ): string {
    return Object.entries(values).reduce(
      (acc, [key, value]) =>
        acc.split(`{${key}}`).join(value),
      template,
    );
  }
}
