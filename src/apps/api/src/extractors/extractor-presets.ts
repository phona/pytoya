import { ExtractorPresetDto } from './dto/extractor-preset.dto';

export const EXTRACTOR_PRESETS: ExtractorPresetDto[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o Vision',
    description: 'OpenAI GPT-4o vision model for direct text extraction',
    extractorType: 'vision-llm',
    config: {
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      temperature: 0,
      maxTokens: 4096,
      pricing: {
        mode: 'token',
        currency: 'USD',
        inputPricePerMillionTokens: 2.5,
        outputPricePerMillionTokens: 10,
      },
    },
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet Vision',
    description: 'Anthropic Claude 3.5 Sonnet via OpenAI-compatible proxy',
    extractorType: 'vision-llm',
    config: {
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-5-sonnet',
      temperature: 0,
      maxTokens: 4096,
      pricing: {
        mode: 'token',
        currency: 'USD',
        inputPricePerMillionTokens: 3,
        outputPricePerMillionTokens: 15,
      },
    },
  },
  {
    id: 'qwen-vl',
    name: 'Qwen Vision',
    description: 'Qwen vision model (OpenAI-compatible endpoint)',
    extractorType: 'vision-llm',
    config: {
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-vl-max',
      temperature: 0,
      maxTokens: 4096,
      pricing: {
        mode: 'token',
        currency: 'USD',
        inputPricePerMillionTokens: 0.1,
        outputPricePerMillionTokens: 0.1,
      },
    },
  },
];
