import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Ajv from 'ajv';
import { Repository } from 'typeorm';

import { ModelEntity } from '../entities/model.entity';
import { LlmResponseFormat } from '../llm/llm.types';
import { LlmService } from '../llm/llm.service';
import { LlmProviderConfig } from '../llm/llm.types';
import { adapterRegistry } from '../models/adapters/adapter-registry';
import { GenerateSchemaDto } from './dto/generate-schema.dto';

@Injectable()
export class SchemaGeneratorService {
  private readonly ajv = new Ajv({ allErrors: true, strict: false });

  constructor(
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    private readonly llmService: LlmService,
  ) {}

  async generate(input: GenerateSchemaDto): Promise<Record<string, unknown>> {
    const model = await this.getLlmModel(input.modelId);
    const providerConfig = this.buildProviderConfig(model);

    const systemPrompt = [
      'You generate JSON Schema for data extraction.',
      'Return a valid JSON Schema object only (no markdown, no explanations).',
      'The schema MUST use "type": "object" at the root and define "properties".',
      input.includeExtractionHints
        ? 'Include "x-extraction-hint" string fields where helpful for extraction.'
        : 'Do NOT include any non-standard properties.',
    ].join('\n');

    const userPrompt = [
      'Description:',
      input.description.trim(),
      '',
      'Generate the JSON Schema now.',
    ].join('\n');

    const response = await this.llmService.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { responseFormat: { type: 'json_object' } as LlmResponseFormat },
      providerConfig,
    );

    const schema = this.parseJson(response.content);
    const validation = this.ajv.validateSchema(schema);
    if (!validation) {
      const errors = this.ajv.errors
        ?.map((err) => err.message ?? 'Invalid schema')
        .join('; ');
      throw new BadRequestException(errors || 'Invalid JSON Schema');
    }

    return schema;
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
      throw new BadRequestException('Generated schema is not a JSON object');
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
