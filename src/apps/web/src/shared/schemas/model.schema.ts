import { z } from 'zod';
import type { AdapterSchema, ParameterDefinition } from '@/api/models';

const buildStringSchema = (definition: ParameterDefinition) => {
  let schema = z.string();
  if (definition.validation?.pattern) {
    schema = schema.regex(
      new RegExp(definition.validation.pattern),
      `${definition.label} format is invalid`,
    );
  }
  if (definition.required) {
    schema = schema.min(1, `${definition.label} is required`);
  }
  return definition.required ? schema : schema.optional();
};

const buildNumberSchema = (definition: ParameterDefinition) => {
  let numberSchema = z.number();
  if (typeof definition.validation?.min === 'number') {
    numberSchema = numberSchema.min(
      definition.validation.min,
      `${definition.label} is too small`,
    );
  }
  if (typeof definition.validation?.max === 'number') {
    numberSchema = numberSchema.max(
      definition.validation.max,
      `${definition.label} is too large`,
    );
  }

  const schema = z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) {
      return definition.required ? value : undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }, numberSchema);

  return definition.required ? schema : schema.optional();
};

const buildEnumSchema = (definition: ParameterDefinition) => {
  const options = definition.validation?.enum ?? [];
  if (options.length === 0) {
    return definition.required
      ? z.string().min(1, `${definition.label} is required`)
      : z.string().optional();
  }
  const enumSchema = z.enum(options as [string, ...string[]]);
  if (definition.required) {
    return enumSchema;
  }
  return z.preprocess(
    (value) => (value === '' ? undefined : value),
    enumSchema.optional(),
  );
};

const buildParameterSchema = (definition: ParameterDefinition) => {
  switch (definition.type) {
    case 'number':
      return buildNumberSchema(definition);
    case 'boolean':
      return definition.required ? z.boolean() : z.boolean().optional();
    case 'enum':
      return buildEnumSchema(definition);
    case 'string':
    default:
      return buildStringSchema(definition);
  }
};

/** Builds a model form schema from the adapter parameter definitions. */
export const buildModelSchema = (adapter: AdapterSchema) => {
  const parametersShape: Record<string, z.ZodTypeAny> = {};

  Object.entries(adapter.parameters).forEach(([key, definition]) => {
    parametersShape[key] = buildParameterSchema(definition);
  });

  return z.object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
    description: z.string().max(500, 'Description is too long').optional(),
    isActive: z.boolean(),
    parameters: z.object(parametersShape),
  });
};

/** Form values inferred from buildModelSchema. */
export type ModelFormValues = z.infer<ReturnType<typeof buildModelSchema>>;




