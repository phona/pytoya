import { AdapterSchema } from './adapter.interface';

export const OpenaiAdapterSchema: AdapterSchema = {
  type: 'openai',
  name: 'OpenAI-Compatible',
  description: 'OpenAI API compatible LLMs (GPT-4, Claude, etc.)',
  category: 'llm',
  parameters: {
    baseUrl: {
      type: 'string',
      required: true,
      label: 'Base URL',
      placeholder: 'https://api.openai.com/v1',
      helpText: 'OpenAI-compatible API endpoint',
    },
    apiKey: {
      type: 'string',
      required: true,
      label: 'API Key',
      secret: true,
    },
    modelName: {
      type: 'string',
      required: true,
      label: 'Model Name',
      placeholder: 'gpt-4o',
      helpText: 'Model to use for completions',
    },
    temperature: {
      type: 'number',
      required: false,
      default: 0.7,
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
    supportsVision: {
      type: 'boolean',
      required: false,
      default: false,
      label: 'Supports Vision',
      helpText: 'Can process images directly',
    },
    supportsStructuredOutput: {
      type: 'boolean',
      required: false,
      default: false,
      label: 'Structured Output',
      helpText: 'Enforces JSON schema compliance',
    },
  },
  capabilities: ['llm', 'vision'],
};
