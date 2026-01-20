import { ConfigService } from '@nestjs/config';

import { LlmService } from '../../llm/llm.service';
import { LlmChatMessage, LlmContentImage, LlmContentText } from '../../llm/llm.types';
import { BaseTextExtractor } from '../base-text-extractor';
import {
  ExtractorMetadata,
  TextExtractionInput,
  TextExtractionResult,
  TextExtractorConfig,
} from '../types/extractor.types';
import { PRICING_SCHEMA } from '../types/pricing-schema';

export type VisionLlmConfig = TextExtractorConfig & {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  detail?: 'low' | 'high' | 'auto';
  prompt?: string;
};

const DEFAULT_PROMPT =
  'Extract all readable text from this document. Return plain text with line breaks and preserve numbers and labels.';

export class VisionLlmExtractor extends BaseTextExtractor<VisionLlmConfig> {
  static metadata: ExtractorMetadata = {
    id: 'vision-llm',
    name: 'Vision LLM (OpenAI-compatible)',
    description: 'Generic OpenAI-compatible vision model for text extraction',
    version: '1.0.0',
    category: 'vision',
    supportedFormats: ['image'],
    pricingSchema: PRICING_SCHEMA,
    paramsSchema: {
      baseUrl: {
        type: 'string',
        required: false,
        label: 'Base URL',
        placeholder: 'https://api.openai.com/v1',
      },
      apiKey: {
        type: 'string',
        required: true,
        label: 'API Key',
        secret: true,
      },
      model: {
        type: 'string',
        required: true,
        label: 'Model',
        placeholder: 'gpt-4o',
      },
      temperature: {
        type: 'number',
        required: false,
        default: 0,
        label: 'Temperature',
        validation: { min: 0, max: 2 },
      },
      maxTokens: {
        type: 'number',
        required: false,
        default: 4096,
        label: 'Max Tokens',
        validation: { min: 1, max: 128000 },
      },
      detail: {
        type: 'enum',
        required: false,
        default: 'auto',
        label: 'Image Detail',
        validation: { enum: ['low', 'high', 'auto'] },
      },
      prompt: {
        type: 'string',
        required: false,
        label: 'Custom Prompt',
        placeholder: DEFAULT_PROMPT,
      },
    },
  };

  private readonly llmService: LlmService;
  private readonly configService?: ConfigService;

  constructor(config: VisionLlmConfig, deps?: { llmService?: LlmService; configService?: ConfigService }) {
    super(config);
    if (!deps?.llmService) {
      throw new Error('VisionLLMExtractor requires LlmService');
    }
    this.llmService = deps.llmService;
    this.configService = deps.configService;
  }

  async extract(input: TextExtractionInput): Promise<TextExtractionResult> {
    const start = Date.now();
    const prompt = this.config.prompt?.trim() || DEFAULT_PROMPT;
    const messages = this.buildMessages(prompt, input);

    const providerConfig = {
      type: 'openai',
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      modelName: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      supportsVision: true,
      supportsStructuredOutput: false,
    };

    const response = await this.llmService.createChatCompletion(messages, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      apiKey: this.config.apiKey,
      timeoutMs: this.configService?.get<number>('LLM_TIMEOUT'),
    }, providerConfig);

    const usage = response.usage;
    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;
    const textCost = this.calculateTokenCost(inputTokens, outputTokens) || this.calculateFixedCost();
    const pagesProcessed = input.pages?.length ?? 1;

    return {
      text: response.content,
      markdown: response.content,
      metadata: {
        extractorId: VisionLlmExtractor.metadata.id,
        processingTimeMs: Date.now() - start,
        textCost,
        currency: this.getPricing().currency,
        inputTokens,
        outputTokens,
        pagesProcessed,
      },
    };
  }

  private buildMessages(prompt: string, input: TextExtractionInput): LlmChatMessage[] {
    const pages = input.pages ?? [];
    const content: Array<LlmContentText | LlmContentImage> = [
      { type: 'text', text: prompt },
    ];

    if (pages.length > 0) {
      pages.forEach((page) => {
        const base64 = page.buffer.toString('base64');
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${page.mimeType};base64,${base64}`,
            detail: this.config.detail ?? 'auto',
          },
        });
      });
    } else {
      const mimeType = input.mimeType ?? 'image/png';
      const base64 = input.buffer.toString('base64');
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64}`,
          detail: this.config.detail ?? 'auto',
        },
      });
    }

    return [
      {
        role: 'user',
        content,
      },
    ];
  }
}
