const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const X_UI_ORDER_KEY = 'x-ui-order';

const readUiOrder = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getSchemaNodeUiOrder = (schemaNode: unknown): number | null => {
  if (!isRecord(schemaNode)) {
    return null;
  }
  return readUiOrder(schemaNode[X_UI_ORDER_KEY]);
};

const getOrderedPropertyEntries = (
  properties: Record<string, unknown>,
): Array<[string, unknown]> =>
  Object.entries(properties).sort(([aKey, aSchema], [bKey, bSchema]) => {
    const aOrder = getSchemaNodeUiOrder(aSchema);
    const bOrder = getSchemaNodeUiOrder(bSchema);
    const aHasOrder = aOrder !== null;
    const bHasOrder = bOrder !== null;

    if (aHasOrder && bHasOrder && aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    if (aHasOrder !== bHasOrder) {
      return aHasOrder ? -1 : 1;
    }

    return aKey.localeCompare(bKey);
  });

const canonicalizeJsonValueForStringify = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValueForStringify);
  }

  if (!isRecord(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(record)) {
    if (key === 'properties' && isRecord(child)) {
      const orderedProps: Record<string, unknown> = {};
      for (const [propName, propSchema] of getOrderedPropertyEntries(child as Record<string, unknown>)) {
        orderedProps[propName] = canonicalizeJsonValueForStringify(propSchema);
      }
      next[key] = orderedProps;
      continue;
    }

    next[key] = canonicalizeJsonValueForStringify(child);
  }

  return next;
};

export const canonicalizeJsonSchemaForStringify = (
  jsonSchema: Record<string, unknown>,
): Record<string, unknown> =>
  canonicalizeJsonValueForStringify(jsonSchema) as Record<string, unknown>;

