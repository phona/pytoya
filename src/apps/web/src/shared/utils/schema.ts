export const deriveRequiredFields = (jsonSchema: Record<string, unknown>): string[] => {
  const fields = new Set<string>();

  const getTypes = (schema: Record<string, unknown>): string[] => {
    const typeValue = schema.type;
    if (Array.isArray(typeValue)) {
      return typeValue.filter((value): value is string => typeof value === 'string');
    }
    if (typeof typeValue === 'string') {
      return [typeValue];
    }
    return [];
  };

  const isObjectSchema = (schema: Record<string, unknown>) => {
    const types = getTypes(schema);
    return types.includes('object') || Boolean(schema.properties);
  };

  const isArraySchema = (schema: Record<string, unknown>) => {
    const types = getTypes(schema);
    return types.includes('array') || Boolean(schema.items);
  };

  const getItemsSchema = (schema: Record<string, unknown>): Record<string, unknown> | null => {
    const items = schema.items;
    if (!items) return null;
    if (Array.isArray(items)) {
      const first = items[0];
      return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
    }
    return typeof items === 'object' ? (items as Record<string, unknown>) : null;
  };

  const walk = (schema: Record<string, unknown> | null, prefix: string) => {
    if (!schema) return;

    const properties = schema.properties as Record<string, unknown> | undefined;
    const objectSchema = isObjectSchema(schema);
    const arraySchema = isArraySchema(schema);

    if (objectSchema) {
      const required = Array.isArray(schema.required) ? schema.required : [];
      for (const entry of required) {
        if (typeof entry !== 'string' || !entry.trim()) continue;
        const path = prefix ? `${prefix}.${entry}` : entry;
        fields.add(path);

        const propSchema = properties?.[entry];
        if (propSchema && typeof propSchema === 'object') {
          const propSchemaObj = propSchema as Record<string, unknown>;
          if (isArraySchema(propSchemaObj)) {
            const itemsSchema = getItemsSchema(propSchemaObj);
            if (itemsSchema) {
              walk(itemsSchema, `${path}[]`);
            }
          } else if (isObjectSchema(propSchemaObj)) {
            walk(propSchemaObj, path);
          }
        }
      }
    }

    if (!objectSchema && arraySchema) {
      const itemsSchema = getItemsSchema(schema);
      if (itemsSchema) {
        const nextPrefix = prefix ? `${prefix}[]` : '[]';
        walk(itemsSchema, nextPrefix);
      }
    }
  };

  walk(jsonSchema, '');

  return Array.from(fields);
};
