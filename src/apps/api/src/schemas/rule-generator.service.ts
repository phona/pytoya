import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ModelEntity } from '../entities/model.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { SchemaRuleOperator, SchemaRuleType } from '../entities/schema-rule.entity';
import { LlmResponseFormat, LlmProviderConfig } from '../llm/llm.types';
import { LlmService } from '../llm/llm.service';
import { adapterRegistry } from '../models/adapters/adapter-registry';
import { GenerateRulesDto } from './dto/generate-rules.dto';
import { canonicalizeJsonSchemaForStringify } from './utils/canonicalize-json-schema';

type GeneratedRule = {
  fieldPath: string;
  ruleType: SchemaRuleType;
  ruleOperator: SchemaRuleOperator;
  ruleConfig: Record<string, unknown>;
  errorMessage?: string;
  priority?: number;
  enabled?: boolean;
  description?: string;
};

@Injectable()
export class RuleGeneratorService {
  constructor(
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    private readonly llmService: LlmService,
  ) {}

  async generate(
    schema: Pick<SchemaEntity, 'jsonSchema'>,
    input: GenerateRulesDto,
  ): Promise<GeneratedRule[]> {
    const model = await this.getLlmModel(input.modelId);
    const providerConfig = this.buildProviderConfig(model);

    const schemaJson = JSON.stringify(
      canonicalizeJsonSchemaForStringify(schema.jsonSchema as Record<string, unknown>),
      null,
      2,
    );
    const systemPrompt = [
      'You generate validation rules for JSON Schema extraction.',
      'Return JSON only with a top-level "rules" array.',
      'Each rule must include: fieldPath, ruleType, ruleOperator, ruleConfig.',
      'Allowed ruleType values: verification, restriction.',
      'Allowed ruleOperator values: pattern, enum, range_min, range_max, length_min, length_max, ocr_correction.',
      'ruleConfig formats:',
      '- pattern: { "regex": "..." }',
      '- enum: { "values": ["A", "B"] }',
      '- range_min/max: { "value": 0 }',
      '- length_min/max: { "value": 1 }',
      '- ocr_correction: { "mappings": [ { "from": "0", "to": "O" } ] }',
      'Use fieldPath in dot notation (e.g., "invoice.po_no", "items[].unit").',
      'If unsure, return an empty rules array.',
    ].join('\n');

    const userPrompt = [
      'Schema JSON:',
      schemaJson,
      '',
      'Description:',
      input.description.trim(),
      input.context ? `\nContext:\n${input.context.trim()}` : '',
      '',
      'Generate rules now.',
    ].join('\n');

    const response = await this.llmService.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { responseFormat: { type: 'json_object' } as LlmResponseFormat },
      providerConfig,
    );

    const parsed = this.parseJson(response.content);
    const rawRules = Array.isArray(parsed.rules) ? parsed.rules : [];

    const normalized = rawRules
      .map((rule) => this.normalizeRule(rule))
      .filter((rule): rule is GeneratedRule => rule !== null);

    return normalized;
  }

  private normalizeRule(rule: unknown): GeneratedRule | null {
    if (!rule || typeof rule !== 'object') {
      return null;
    }
    const candidate = rule as Record<string, unknown>;
    const fieldPath = typeof candidate.fieldPath === 'string'
      ? candidate.fieldPath.trim()
      : '';
    if (!fieldPath) {
      return null;
    }

    const ruleType = this.normalizeEnum(candidate.ruleType, SchemaRuleType);
    const ruleOperator = this.normalizeEnum(candidate.ruleOperator, SchemaRuleOperator);
    if (!ruleType || !ruleOperator) {
      return null;
    }

    const ruleConfig =
      candidate.ruleConfig && typeof candidate.ruleConfig === 'object'
        ? (candidate.ruleConfig as Record<string, unknown>)
        : {};

    return {
      fieldPath,
      ruleType,
      ruleOperator,
      ruleConfig,
      errorMessage:
        typeof candidate.errorMessage === 'string' ? candidate.errorMessage : undefined,
      priority:
        typeof candidate.priority === 'number' && Number.isFinite(candidate.priority)
          ? candidate.priority
          : undefined,
      enabled:
        typeof candidate.enabled === 'boolean' ? candidate.enabled : undefined,
      description:
        typeof candidate.description === 'string' ? candidate.description : undefined,
    };
  }

  private normalizeEnum<T extends Record<string, string>>(
    value: unknown,
    enumObj: T,
  ): T[keyof T] | null {
    if (typeof value !== 'string') {
      return null;
    }
    const values = Object.values(enumObj);
    return values.includes(value) ? (value as T[keyof T]) : null;
  }

  private async getLlmModel(modelId: string): Promise<ModelEntity> {
    const model = await this.modelRepository.findOne({
      where: { id: modelId },
    });
    if (!model) {
      throw new BadRequestException(`Model ${modelId} not found`);
    }
    const schema = adapterRegistry.getSchema(model.adapterType);
    if (!schema) {
      throw new BadRequestException(
        `Model ${modelId} has unknown adapter type`,
      );
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

  private parseJson(content: string): Record<string, unknown> {
    const sanitized = this.stripJsonCodeFence(content);
    const parsed = JSON.parse(sanitized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('Generated rules response is not a JSON object');
    }
    return parsed as Record<string, unknown>;
  }

  private stripJsonCodeFence(content: string): string {
    const trimmed = content.trim();
    if (!trimmed.startsWith('```')) {
      return trimmed;
    }

    return trimmed
      .replace(/^```json\n?/, '')
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/```$/, '')
      .trim();
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
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private getBooleanParam(
    parameters: Record<string, unknown>,
    key: string,
  ): boolean | undefined {
    const value = parameters[key];
    return typeof value === 'boolean' ? value : undefined;
  }
}
