import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ModelEntity } from '../entities/model.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { LlmProviderConfig } from '../llm/llm.types';
import { LlmService } from '../llm/llm.service';
import { adapterRegistry } from '../models/adapters/adapter-registry';
import { GeneratePromptRulesDto } from './dto/generate-prompt-rules.dto';
import { canonicalizeJsonSchemaForStringify } from './utils/canonicalize-json-schema';

@Injectable()
export class PromptRulesGeneratorService {
  constructor(
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    private readonly llmService: LlmService,
  ) {}

  async generate(
    schema: Pick<SchemaEntity, 'jsonSchema'>,
    input: GeneratePromptRulesDto,
  ): Promise<string> {
    let full = '';
    for await (const chunk of this.generateStream(schema, input)) {
      full += chunk;
    }

    const markdown = this.stripCodeFence(full).trim();
    if (!markdown) {
      throw new BadRequestException('Generated prompt rules are empty');
    }

    return markdown;
  }

  async *generateStream(
    schema: Pick<SchemaEntity, 'jsonSchema'>,
    input: GeneratePromptRulesDto,
  ): AsyncGenerator<string, void, void> {
    const model = await this.getLlmModel(input.modelId);
    const providerConfig = this.buildProviderConfig(model);

    const schemaJson = JSON.stringify(
      canonicalizeJsonSchemaForStringify(schema.jsonSchema as Record<string, unknown>),
      null,
      2,
    );

    const systemPrompt = [
      'You author Prompt Rules in Markdown to guide an LLM extraction system.',
      'Return ONLY the Markdown document. Do not wrap in code fences.',
      'Do NOT include output format instructions (JSON/YAML).',
      'Do NOT paste the full JSON Schema into the rules.',
      'Keep rules generic unless the user explicitly requests domain-specific rules.',
      '',
      'Recommended sections (include only what is relevant):',
      '- ## OCR Corrections',
      '- ## Field Extraction Rules',
      '- ## Items/Table Handling',
      '- ## Cross Verification',
      '',
      'Use tables for correction mappings when possible.',
      'Prefer concise, actionable bullet points.',
    ].join('\n');

    const userPrompt = [
      'Schema JSON:',
      schemaJson,
      '',
      input.currentRulesMarkdown?.trim()
        ? `Current Prompt Rules (Markdown):\n${input.currentRulesMarkdown.trim()}`
        : 'Current Prompt Rules (Markdown): <none>',
      '',
      input.previousCandidateMarkdown?.trim()
        ? `Previous candidate (rejected):\n${input.previousCandidateMarkdown.trim()}`
        : '',
      input.feedback?.trim()
        ? `Rejection feedback:\n${input.feedback.trim()}`
        : '',
      '',
      'User request:',
      input.prompt.trim(),
      '',
      'Generate the updated Prompt Rules Markdown now.',
    ]
      .filter(Boolean)
      .join('\n');

    // Larger timeout: rule generation can take longer.
    const stream = this.llmService.createChatCompletionStream(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { timeoutMs: 180_000 },
      providerConfig,
    );

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  private stripCodeFence(content: string): string {
    const trimmed = content.trim();
    if (!trimmed.startsWith('```')) {
      return trimmed;
    }

    return trimmed
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/```$/, '')
      .trim();
  }

  private async getLlmModel(modelId: string): Promise<ModelEntity> {
    const model = await this.modelRepository.findOne({ where: { id: modelId } });
    if (!model) {
      throw new BadRequestException(`Model ${modelId} not found`);
    }

    const schema = adapterRegistry.getSchema(model.adapterType);
    if (!schema) {
      throw new BadRequestException(`Model ${modelId} has unknown adapter type`);
    }
    if (schema.category !== 'llm') {
      throw new BadRequestException(`Model ${modelId} is not a valid LLM model`);
    }

    return model;
  }

  private buildProviderConfig(model: ModelEntity): LlmProviderConfig {
    const parameters = model.parameters ?? {};
    return {
      type: model.adapterType,
      baseUrl: this.getStringParam(parameters, 'baseUrl'),
      apiKey: this.getStringParam(parameters, 'apiKey'),
      modelName: this.getStringParam(parameters, 'modelName'),
      temperature: this.getNumberParam(parameters, 'temperature'),
      maxTokens: this.getNumberParam(parameters, 'maxTokens'),
      supportsStructuredOutput: this.getBooleanParam(parameters, 'supportsStructuredOutput'),
      supportsVision: this.getBooleanParam(parameters, 'supportsVision'),
    };
  }

  private getStringParam(parameters: Record<string, unknown>, key: string): string | undefined {
    const value = parameters[key];
    return typeof value === 'string' ? value : undefined;
  }

  private getNumberParam(parameters: Record<string, unknown>, key: string): number | undefined {
    const value = parameters[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private getBooleanParam(parameters: Record<string, unknown>, key: string): boolean | undefined {
    const value = parameters[key];
    return typeof value === 'boolean' ? value : undefined;
  }
}
