import { AdapterCategory, AdapterSchema, ParameterDefinition } from './adapter.interface';
import { OpenaiAdapterSchema } from './openai.adapter';
import { PaddlexAdapterSchema } from './paddlex.adapter';

export type AdapterValidationResult = {
  valid: boolean;
  errors: string[];
};

export class AdapterRegistry {
  private readonly schemas: Map<string, AdapterSchema>;

  constructor(schemas: AdapterSchema[]) {
    this.schemas = new Map(
      schemas.map((schema) => [schema.type, schema]),
    );
  }

  getSchema(adapterType: string): AdapterSchema | undefined {
    return this.schemas.get(adapterType);
  }

  listAdapters(): AdapterSchema[] {
    return Array.from(this.schemas.values());
  }

  getAdaptersByCategory(category: AdapterCategory): AdapterSchema[] {
    return this.listAdapters().filter((schema) => schema.category === category);
  }

  validateParameters(
    adapterType: string,
    parameters: unknown,
  ): AdapterValidationResult {
    const schema = this.getSchema(adapterType);
    if (!schema) {
      return {
        valid: false,
        errors: [`Unknown adapter type: ${adapterType}`],
      };
    }

    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
      return {
        valid: false,
        errors: ['Parameters must be an object'],
      };
    }

    const data = parameters as Record<string, unknown>;
    const errors: string[] = [];

    for (const key of Object.keys(data)) {
      if (!schema.parameters[key]) {
        errors.push(`Unknown parameter: ${key}`);
      }
    }

    for (const [key, definition] of Object.entries(schema.parameters)) {
      const value = data[key];
      if (value === undefined || value === null) {
        if (definition.required) {
          errors.push(`Missing required parameter: ${key}`);
        }
        continue;
      }

      const typeError = this.validateType(key, value, definition);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      const constraintError = this.validateConstraints(
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

  private validateType(
    key: string,
    value: unknown,
    definition: ParameterDefinition,
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

  private validateConstraints(
    key: string,
    value: unknown,
    definition: ParameterDefinition,
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

export const adapterRegistry = new AdapterRegistry([
  PaddlexAdapterSchema,
  OpenaiAdapterSchema,
]);
