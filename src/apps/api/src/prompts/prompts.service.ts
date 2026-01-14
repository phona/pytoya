import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PromptEntity } from '../entities/prompt.entity';
import { INVOICE_JSON_SCHEMA } from './constants/invoice-json-schema.constant';
import {
  JSON_FEEDBACK_TEMPLATE,
  OCR_SECTION,
  PREVIOUS_RESULT_TEMPLATE as JSON_PREVIOUS_RESULT_TEMPLATE,
  RE_EXTRACT_RETURN_JSON_INSTRUCTION,
  RETURN_JSON_INSTRUCTION,
} from './constants/json-prompt-templates.constant';
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
    const schema = JSON.stringify(INVOICE_JSON_SCHEMA, null, 2);
    const instruction = this.interpolateTemplate(RETURN_JSON_INSTRUCTION, {
      schema,
    });

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

    const feedback = this.interpolateTemplate(JSON_FEEDBACK_TEMPLATE, {
      error: errorStr,
      missing_fields: missingFieldsStr,
    });

    const previousResultStr = this.formatResultAsJson(previousResult);
    const previousResultSection = this.interpolateTemplate(
      JSON_PREVIOUS_RESULT_TEMPLATE,
      {
        previous_json: previousResultStr,
      },
    );

    const ocrSection = this.interpolateTemplate(OCR_SECTION, {
      markdown_text: ocrMarkdown,
    });

    const schema = JSON.stringify(INVOICE_JSON_SCHEMA, null, 2);
    const returnInstruction = this.interpolateTemplate(
      RE_EXTRACT_RETURN_JSON_INSTRUCTION,
      {
        schema,
      },
    );

    return `${feedback}

${ocrSection}

${previousResultSection}

${returnInstruction}`;
  }

  formatResultAsJson(result: ExtractedData): string {
    return JSON.stringify(result, null, 2);
  }

  getInvoiceJsonSchema(): Record<string, unknown> {
    return INVOICE_JSON_SCHEMA;
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
