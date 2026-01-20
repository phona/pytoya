import { ExtractorParamSchema } from './extractor.types';

export const PRICING_SCHEMA: ExtractorParamSchema = {
  mode: {
    type: 'enum',
    required: true,
    label: 'Pricing Mode',
    validation: { enum: ['token', 'page', 'fixed', 'none'] },
  },
  currency: {
    type: 'string',
    required: true,
    label: 'Currency',
    placeholder: 'USD',
  },
  inputPricePerMillionTokens: {
    type: 'number',
    required: false,
    label: 'Input Price (per 1M tokens)',
    validation: { min: 0 },
  },
  outputPricePerMillionTokens: {
    type: 'number',
    required: false,
    label: 'Output Price (per 1M tokens)',
    validation: { min: 0 },
  },
  pricePerPage: {
    type: 'number',
    required: false,
    label: 'Price Per Page',
    validation: { min: 0 },
  },
  fixedCost: {
    type: 'number',
    required: false,
    label: 'Fixed Cost',
    validation: { min: 0 },
  },
  minimumCharge: {
    type: 'number',
    required: false,
    label: 'Minimum Charge',
    validation: { min: 0 },
  },
};
