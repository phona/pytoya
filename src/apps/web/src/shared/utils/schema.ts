const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const decodeJsonPointerToken = (token: string): string =>
  token.replace(/~1/g, '/').replace(/~0/g, '~');

const resolveJsonPointer = (root: unknown, pointer: string): unknown => {
  if (pointer === '#') {
    return root;
  }

  if (!pointer.startsWith('#/')) {
    return undefined;
  }

  const tokens = pointer
    .slice('#/'.length)
    .split('/')
    .map(decodeJsonPointerToken)
    .filter(Boolean);

  let current: unknown = root;
  for (const token of tokens) {
    if (isRecord(current)) {
      current = current[token];
      continue;
    }
    if (Array.isArray(current)) {
      const index = Number.parseInt(token, 10);
      if (!Number.isFinite(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    return undefined;
  }

  return current;
};

const mergeSchemaNode = (base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...base, ...override };

  const baseProperties = isRecord(base.properties) ? (base.properties as Record<string, unknown>) : null;
  const overrideProperties = isRecord(override.properties) ? (override.properties as Record<string, unknown>) : null;
  if (baseProperties || overrideProperties) {
    merged.properties = {
      ...(baseProperties ?? {}),
      ...(overrideProperties ?? {}),
    };
  }

  const baseRequired = Array.isArray(base.required) ? base.required : null;
  const overrideRequired = Array.isArray(override.required) ? override.required : null;
  if (baseRequired || overrideRequired) {
    merged.required = Array.from(
      new Set([...(baseRequired ?? []), ...(overrideRequired ?? [])].filter((value): value is string => typeof value === 'string')),
    );
  }

  return merged;
};

const resolveSchemaNode = (
  schema: Record<string, unknown>,
  root: Record<string, unknown>,
  seenRefs = new Set<string>(),
  depth = 0,
): Record<string, unknown> => {
  if (depth > 25) {
    return schema;
  }

  const ref = typeof schema.$ref === 'string' ? schema.$ref.trim() : '';
  let resolved: Record<string, unknown> = schema;

  if (ref) {
    if (seenRefs.has(ref)) {
      return schema;
    }
    const target = resolveJsonPointer(root, ref);
    if (isRecord(target)) {
      seenRefs.add(ref);
      const { $ref: _ignored, ...rest } = schema;
      resolved = mergeSchemaNode(resolveSchemaNode(target, root, seenRefs, depth + 1), rest);
    }
  }

  const allOf = Array.isArray(resolved.allOf) ? resolved.allOf.filter(isRecord) : [];
  if (allOf.length > 0) {
    const { allOf: _ignored, ...rest } = resolved;
    let merged = rest;
    for (const entry of allOf) {
      merged = mergeSchemaNode(merged, resolveSchemaNode(entry, root, new Set(seenRefs), depth + 1));
    }
    resolved = merged;
  }

  return resolved;
};

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

const canonicalizeJsonValueForDisplay = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValueForDisplay);
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
        orderedProps[propName] = canonicalizeJsonValueForDisplay(propSchema);
      }
      next[key] = orderedProps;
      continue;
    }

    next[key] = canonicalizeJsonValueForDisplay(child);
  }

  return next;
};

export const canonicalizeJsonSchemaForDisplay = (
  jsonSchema: Record<string, unknown>,
): Record<string, unknown> =>
  canonicalizeJsonValueForDisplay(jsonSchema) as Record<string, unknown>;

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

    const resolvedSchema = resolveSchemaNode(schema, jsonSchema);

    const properties = resolvedSchema.properties as Record<string, unknown> | undefined;
    const objectSchema = isObjectSchema(resolvedSchema);
    const arraySchema = isArraySchema(resolvedSchema);

    if (objectSchema) {
      const required = Array.isArray(resolvedSchema.required) ? resolvedSchema.required : [];
      for (const entry of required) {
        if (typeof entry !== 'string' || !entry.trim()) continue;
        const path = prefix ? `${prefix}.${entry}` : entry;
        fields.add(path);

        const propSchema = properties?.[entry];
        if (propSchema && typeof propSchema === 'object') {
          const propSchemaObj = resolveSchemaNode(propSchema as Record<string, unknown>, jsonSchema);
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
      const itemsSchema = getItemsSchema(resolvedSchema);
      if (itemsSchema) {
        const nextPrefix = prefix ? `${prefix}[]` : '[]';
        walk(itemsSchema, nextPrefix);
      }
    }
  };

  walk(jsonSchema, '');

  return Array.from(fields);
};

export const deriveExtractionHintMap = (
  jsonSchema: Record<string, unknown>,
): Record<string, string> => {
  const hints: Record<string, string> = {};

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

  const tryAddHint = (schema: Record<string, unknown>, prefix: string) => {
    const raw = (schema as Record<string, unknown>)['x-extraction-hint'];
    if (typeof raw === 'string' && raw.trim()) {
      hints[prefix] = raw.trim();
    }
  };

  const walk = (schema: Record<string, unknown> | null, prefix: string) => {
    if (!schema) return;

    const resolvedSchema = resolveSchemaNode(schema, jsonSchema);

    if (prefix) {
      tryAddHint(resolvedSchema, prefix);
    }

    const properties = resolvedSchema.properties as Record<string, unknown> | undefined;
    if (isObjectSchema(resolvedSchema) && properties) {
      for (const [key, value] of Object.entries(properties)) {
        if (!key) continue;
        if (!value || typeof value !== 'object') continue;
        const nextPrefix = prefix ? `${prefix}.${key}` : key;
        walk(value as Record<string, unknown>, nextPrefix);
      }
      return;
    }

    if (isArraySchema(resolvedSchema)) {
      const itemsSchema = getItemsSchema(resolvedSchema);
      if (itemsSchema) {
        const nextPrefix = prefix ? `${prefix}[]` : '[]';
        walk(itemsSchema, nextPrefix);
      }
    }
  };

  walk(jsonSchema, '');
  return hints;
};

export type SchemaFieldType = 'string' | 'number' | 'integer' | 'boolean';

export interface SchemaLeafField {
  path: string;
  type: SchemaFieldType;
  format?: string;
  title?: string;
  required: boolean;
  schemaOrder: number;
}

export interface SchemaArrayObjectField {
  path: string;
  title?: string;
  required: boolean;
  schemaOrder: number;
  itemFields: SchemaLeafField[];
}

export interface SchemaArrayField {
  path: string;
  title?: string;
  required: boolean;
  schemaOrder: number;
}

const pickFieldType = (types: string[]): SchemaFieldType | null => {
  if (types.includes('string')) return 'string';
  if (types.includes('integer')) return 'integer';
  if (types.includes('number')) return 'number';
  if (types.includes('boolean')) return 'boolean';
  return null;
};

export const deriveSchemaAuditFields = (
  jsonSchema: Record<string, unknown>,
): { scalarFields: SchemaLeafField[]; arrayObjectFields: SchemaArrayObjectField[]; arrayFields: SchemaArrayField[] } => {
  const scalarFields: SchemaLeafField[] = [];
  const arrayObjectFields: SchemaArrayObjectField[] = [];
  const arrayFields: SchemaArrayField[] = [];
  let schemaOrder = 0;

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

  const getTitle = (schema: Record<string, unknown>): string | undefined => {
    const title = typeof schema.title === 'string' ? schema.title.trim() : '';
    return title ? title : undefined;
  };

  const walkObjectLeaves = (schema: Record<string, unknown> | null, prefix: string): SchemaLeafField[] => {
    if (!schema || typeof schema !== 'object') {
      return [];
    }

    const resolvedSchema = resolveSchemaNode(schema, jsonSchema);
    const properties = resolvedSchema.properties as Record<string, unknown> | undefined;
    if (!isObjectSchema(resolvedSchema) || !properties) {
      return [];
    }

    const required = new Set<string>(
      Array.isArray(resolvedSchema.required)
        ? resolvedSchema.required.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
        : [],
    );

    const leafFields: SchemaLeafField[] = [];
    for (const [key, value] of getOrderedPropertyEntries(properties)) {
      if (!key || !value || typeof value !== 'object') {
        continue;
      }

      const propSchema = resolveSchemaNode(value as Record<string, unknown>, jsonSchema);
      const path = prefix ? `${prefix}.${key}` : key;

      if (isArraySchema(propSchema)) {
        // Arrays can be rendered at the section level (when not nested under another array).
        if (path.includes('[]')) {
          continue;
        }

        const itemsSchema = getItemsSchema(propSchema);
        const arraySchemaOrder = schemaOrder;
        schemaOrder += 1;

        const resolvedItemsSchema = itemsSchema ? resolveSchemaNode(itemsSchema, jsonSchema) : null;
        if (resolvedItemsSchema && isObjectSchema(resolvedItemsSchema) && resolvedItemsSchema.properties) {
          arrayObjectFields.push({
            path,
            title: getTitle(propSchema),
            required: required.has(key),
            schemaOrder: arraySchemaOrder,
            itemFields: walkObjectLeaves(resolvedItemsSchema, `${path}[]`),
          });
        } else {
          arrayFields.push({
            path,
            title: getTitle(propSchema),
            required: required.has(key),
            schemaOrder: arraySchemaOrder,
          });
        }

        continue;
      }

      if (isObjectSchema(propSchema)) {
        leafFields.push(...walkObjectLeaves(propSchema, path));
        continue;
      }

      const types = getTypes(propSchema);
      const fieldType = pickFieldType(types);
      if (!fieldType) {
        continue;
      }

      const format = typeof propSchema.format === 'string' ? propSchema.format : undefined;
      leafFields.push({
        path,
        type: fieldType,
        format,
        title: getTitle(propSchema),
        required: required.has(key),
        schemaOrder,
      });
      schemaOrder += 1;
    }

    return leafFields;
  };

  if (jsonSchema && typeof jsonSchema === 'object') {
    const resolvedRoot = resolveSchemaNode(jsonSchema, jsonSchema);
    const rootProperties = resolvedRoot.properties as Record<string, unknown> | undefined;
    if (isObjectSchema(resolvedRoot) && rootProperties) {
      const rootRequired = new Set<string>(
        Array.isArray(resolvedRoot.required)
          ? resolvedRoot.required.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
          : [],
      );

      for (const [key, value] of getOrderedPropertyEntries(rootProperties)) {
        if (!key || !value || typeof value !== 'object') {
          continue;
        }

        const propSchema = resolveSchemaNode(value as Record<string, unknown>, jsonSchema);
        const path = key;
        const required = rootRequired.has(key);

        if (isArraySchema(propSchema)) {
          const itemsSchema = getItemsSchema(propSchema);
          const arraySchemaOrder = schemaOrder;
          schemaOrder += 1;

          const resolvedItemsSchema = itemsSchema ? resolveSchemaNode(itemsSchema, jsonSchema) : null;
          if (resolvedItemsSchema && isObjectSchema(resolvedItemsSchema) && resolvedItemsSchema.properties) {
            arrayObjectFields.push({
              path,
              title: getTitle(propSchema),
              required,
              schemaOrder: arraySchemaOrder,
              itemFields: walkObjectLeaves(resolvedItemsSchema, `${path}[]`),
            });
          } else {
            arrayFields.push({
              path,
              title: getTitle(propSchema),
              required,
              schemaOrder: arraySchemaOrder,
            });
          }
          continue;
        }

        if (isObjectSchema(propSchema)) {
          scalarFields.push(...walkObjectLeaves(propSchema, path));
          continue;
        }

        const types = getTypes(propSchema);
        const fieldType = pickFieldType(types);
        if (!fieldType) {
          continue;
        }

        const format = typeof propSchema.format === 'string' ? propSchema.format : undefined;
        scalarFields.push({
          path,
          type: fieldType,
          format,
          title: getTitle(propSchema),
          required,
          schemaOrder,
        });
        schemaOrder += 1;
      }
    }
  }

  return { scalarFields, arrayObjectFields, arrayFields };
};

export type SchemaTableColumn = {
  path: string;
  title?: string;
  type?: SchemaFieldType;
  format?: string;
};

export const deriveSchemaTableColumns = (
  jsonSchema: Record<string, unknown>,
  options: { fallbackLimit?: number } = {},
): SchemaTableColumn[] => {
  const fallbackLimit = options.fallbackLimit ?? 4;
  const { scalarFields } = deriveSchemaAuditFields(jsonSchema);
  const scalarByPath = new Map(scalarFields.map((field) => [field.path, field]));

  const hasXTableColumns = Object.prototype.hasOwnProperty.call(jsonSchema, 'x-table-columns');
  const rawXTableColumns = jsonSchema['x-table-columns'];
  const xTableColumns = Array.isArray(rawXTableColumns)
    ? rawXTableColumns
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean)
    : null;

  if (hasXTableColumns && Array.isArray(rawXTableColumns)) {
    if (xTableColumns && xTableColumns.length === 0) {
      return [];
    }

    return (xTableColumns ?? [])
      .filter((path) => !path.includes('[]'))
      .map((path) => {
        const schemaField = scalarByPath.get(path);
        return {
          path,
          title: schemaField?.title,
          type: schemaField?.type,
          format: schemaField?.format,
        };
      });
  }

  const candidates = scalarFields
    .filter((field) => !field.path.includes('[]'))
    .filter((field) => !field.path.startsWith('_extraction_info') && !field.path.startsWith('_'))
    .sort((a, b) => {
      if (a.required !== b.required) {
        return a.required ? -1 : 1;
      }
      return a.schemaOrder - b.schemaOrder;
    })
    .slice(0, fallbackLimit);

  return candidates.map((field) => ({
    path: field.path,
    title: field.title,
    type: field.type,
    format: field.format,
  }));
};




