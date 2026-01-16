import { AdapterSchema } from './adapter.interface';

export const PaddlexAdapterSchema: AdapterSchema = {
  type: 'paddlex',
  name: 'PaddleX OCR',
  description: 'PaddleOCR-VL for invoice OCR processing',
  category: 'ocr',
  parameters: {
    baseUrl: {
      type: 'string',
      required: true,
      label: 'Base URL',
      placeholder: 'http://localhost:8080',
      helpText: 'PaddleOCR-VL service endpoint',
    },
    apiKey: {
      type: 'string',
      required: false,
      label: 'API Key',
      secret: true,
      helpText: 'Optional API key for PaddleOCR service',
    },
    timeout: {
      type: 'number',
      required: false,
      default: 60000,
      label: 'Timeout (ms)',
      validation: { min: 1000, max: 300000 },
    },
    maxRetries: {
      type: 'number',
      required: false,
      default: 3,
      label: 'Max Retries',
      validation: { min: 0, max: 10 },
    },
  },
  capabilities: ['ocr'],
};
