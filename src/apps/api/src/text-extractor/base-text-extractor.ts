import { BadRequestException } from '@nestjs/common';
import {
  ExtractorParamDefinition,
  ExtractorParamSchema,
  ExtractorMetadata,
  ExtractorValidationResult,
  PricingConfig,
  TextExtractor,
  TextExtractorConfig,
} from './types/extractor.types';

export abstract class BaseTextExtractor<TConfig extends TextExtractorConfig = TextExtractorConfig>
  implements TextExtractor {
  static metadata?: ExtractorMetadata;
  protected readonly config: TConfig;

  constructor(config: TConfig) {
    this.config = config;
    this.validateConfig();
  }

  abstract extract(input: Parameters<TextExtractor['extract']>[0]): ReturnType<TextExtractor['extract']>;

  protected getPricing(): PricingConfig {
    const pricing = this.config.pricing ?? { mode: 'none', currency: 'USD' };
    return {
      mode: pricing.mode ?? 'none',
      currency: pricing.currency ?? 'USD',
      inputPricePerMillionTokens: pricing.inputPricePerMillionTokens,
      outputPricePerMillionTokens: pricing.outputPricePerMillionTokens,
      pricePerPage: pricing.pricePerPage,
      fixedCost: pricing.fixedCost,
      minimumCharge: pricing.minimumCharge,
    };
  }

  protected calculateTokenCost(inputTokens: number, outputTokens: number): number {
    const pricing = this.getPricing();
    if (pricing.mode !== 'token') {
      return 0;
    }
    const safeInput = Math.max(0, inputTokens);
    const safeOutput = Math.max(0, outputTokens);
    const inputCost =
      pricing.inputPricePerMillionTokens
        ? (safeInput / 1_000_000) * pricing.inputPricePerMillionTokens
        : 0;
    const outputCost =
      pricing.outputPricePerMillionTokens
        ? (safeOutput / 1_000_000) * pricing.outputPricePerMillionTokens
        : 0;
    const total = inputCost + outputCost;
    return pricing.minimumCharge ? Math.max(total, pricing.minimumCharge) : total;
  }

  protected calculatePageCost(pagesProcessed: number): number {
    const pricing = this.getPricing();
    if (pricing.mode !== 'page') {
      return 0;
    }
    const safePages = Math.max(0, pagesProcessed);
    const cost = pricing.pricePerPage ? safePages * pricing.pricePerPage : 0;
    return pricing.minimumCharge ? Math.max(cost, pricing.minimumCharge) : cost;
  }

  protected calculateFixedCost(): number {
    const pricing = this.getPricing();
    if (pricing.mode !== 'fixed') {
      return 0;
    }
    const cost = pricing.fixedCost ?? 0;
    return pricing.minimumCharge ? Math.max(cost, pricing.minimumCharge) : cost;
  }

  protected validateConfig(): void {
    const config = this.config ?? ({} as TConfig);
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new BadRequestException('Extractor config must be an object');
    }

    const schema =
      (this.constructor as typeof BaseTextExtractor).metadata?.paramsSchema ?? {};
    const result = this.validateAgainstSchema(schema, config);
    if (!result.valid) {
      throw new BadRequestException(result.errors.join('; ') || 'Invalid extractor config');
    }

    this.validatePricingConfig();
  }

  protected validatePricingConfig(): void {
    const pricing = this.getPricing();
    const errors: string[] = [];

    if (!pricing.currency || typeof pricing.currency !== 'string') {
      errors.push('Pricing currency is required');
    }

    if (pricing.mode === 'token') {
      if (pricing.inputPricePerMillionTokens === undefined) {
        errors.push('Token pricing requires inputPricePerMillionTokens');
      }
      if (pricing.outputPricePerMillionTokens === undefined) {
        errors.push('Token pricing requires outputPricePerMillionTokens');
      }
    }

    if (pricing.mode === 'page' && pricing.pricePerPage === undefined) {
      errors.push('Page pricing requires pricePerPage');
    }

    if (pricing.mode === 'fixed' && pricing.fixedCost === undefined) {
      errors.push('Fixed pricing requires fixedCost');
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  protected validateAgainstSchema(
    schema: ExtractorParamSchema,
    config: Record<string, unknown>,
  ): ExtractorValidationResult {
    return BaseTextExtractor.validateAgainstSchema(schema, config);
  }

  static validateAgainstSchema(
    schema: ExtractorParamSchema,
    config: Record<string, unknown>,
  ): ExtractorValidationResult {
    const errors: string[] = [];

    Object.keys(config).forEach((key) => {
      if (key === 'pricing') {
        return;
      }
      if (!schema[key]) {
        errors.push(`Unknown parameter: ${key}`);
      }
    });

    for (const [key, definition] of Object.entries(schema)) {
      const value = config[key];
      if (value === undefined || value === null || value === '') {
        if (definition.required) {
          errors.push(`Missing required parameter: ${key}`);
        }
        continue;
      }

      const typeError = BaseTextExtractor.validateType(key, value, definition);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      const constraintError = BaseTextExtractor.validateConstraints(
        key,
        value,
        definition,
      );
      if (constraintError) {
        errors.push(constraintError);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private static validateType(
    key: string,
    value: unknown,
    definition: ExtractorParamDefinition,
  ): string | null {
    switch (definition.type) {
      case 'string':
        return typeof value === 'string' ? null : `Parameter ${key} must be a string`;
      case 'number':
        return typeof value === 'number' && Number.isFinite(value)
          ? null
          : `Parameter ${key} must be a number`;
      case 'boolean':
        return typeof value === 'boolean' ? null : `Parameter ${key} must be a boolean`;
      case 'enum': {
        const enumValues = definition.validation?.enum ?? [];
        if (typeof value !== 'string') {
          return `Parameter ${key} must be a string`;
        }
        if (!enumValues.includes(value)) {
          return `Parameter ${key} must be one of: ${enumValues.join(', ')}`;
        }
        return null;
      }
      default:
        return `Parameter ${key} has unsupported type`;
    }
  }

  private static validateConstraints(
    key: string,
    value: unknown,
    definition: ExtractorParamDefinition,
  ): string | null {
    const validation = definition.validation;
    if (!validation) {
      return null;
    }

    if (definition.type === 'string' && typeof value === 'string') {
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return `Parameter ${key} does not match pattern`;
        }
      }
    }

    if (definition.type === 'number' && typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return `Parameter ${key} must be >= ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        return `Parameter ${key} must be <= ${validation.max}`;
      }
    }

    return null;
  }
}
