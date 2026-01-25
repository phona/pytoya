type JsonSchemaNode = Record<string, unknown>;

export type FieldSemantic =
  | 'text'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'date-time'
  | 'unknown';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readTypeList = (node: JsonSchemaNode): string[] => {
  const raw = node.type;
  if (typeof raw === 'string') {
    return [raw];
  }
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === 'string');
  }
  return [];
};

const normalizeSemantic = (node: JsonSchemaNode): FieldSemantic => {
  const types = readTypeList(node).filter((t) => t !== 'null');
  const format = typeof node.format === 'string' ? node.format : undefined;

  if (types.includes('integer')) {
    return 'integer';
  }
  if (types.includes('number')) {
    return 'number';
  }
  if (types.includes('boolean')) {
    return 'boolean';
  }
  if (types.includes('string')) {
    if (format === 'date') {
      return 'date';
    }
    if (format === 'date-time') {
      return 'date-time';
    }
    return 'text';
  }

  return 'unknown';
};

const tryResolveNodeFromCombinators = (
  node: JsonSchemaNode,
  segment: string,
): JsonSchemaNode | null => {
  const readArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
  const candidates: unknown[] = [
    ...readArray(node.oneOf),
    ...readArray(node.anyOf),
    ...readArray(node.allOf),
  ];

  for (const entry of candidates) {
    if (!isRecord(entry)) {
      continue;
    }
    const resolved = resolveSchemaNode(entry, segment);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

const resolveSchemaNode = (node: JsonSchemaNode, segment: string): JsonSchemaNode | null => {
  if (!segment) {
    return null;
  }

  const properties = node.properties;
  if (isRecord(properties) && isRecord(properties[segment])) {
    return properties[segment] as JsonSchemaNode;
  }

  return tryResolveNodeFromCombinators(node, segment);
};

export const resolveFieldSemanticFromJsonSchema = (
  jsonSchema: Record<string, unknown> | null | undefined,
  fieldPath: string,
): FieldSemantic => {
  if (!jsonSchema || !isRecord(jsonSchema)) {
    return 'unknown';
  }

  const segments = String(fieldPath ?? '')
    .split('.')
    .map((seg) => seg.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return 'unknown';
  }

  let current: JsonSchemaNode | null = jsonSchema;
  for (const segment of segments) {
    if (!current) {
      return 'unknown';
    }
    current = resolveSchemaNode(current, segment);
  }

  return current ? normalizeSemantic(current) : 'unknown';
};
