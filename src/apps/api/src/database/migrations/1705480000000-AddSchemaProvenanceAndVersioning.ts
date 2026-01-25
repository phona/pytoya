import { MigrationInterface, QueryRunner } from 'typeorm';
import { createHash } from 'crypto';

const JSON_SCHEMA_KEYWORDS = new Set<string>([
  '$id',
  '$schema',
  '$ref',
  '$defs',
  'definitions',
  'title',
  'description',
  'type',
  'properties',
  'items',
  'required',
  'additionalProperties',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
  'enum',
  'const',
  'default',
  'examples',
  'format',
  'minimum',
  'maximum',
  'pattern',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'uniqueItems',
  'dependentRequired',
  'if',
  'then',
  'else',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const looksLikeSchemaNode = (value: Record<string, unknown>): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return (
    'type' in value ||
    'properties' in value ||
    'items' in value ||
    '$ref' in value ||
    'oneOf' in value ||
    'anyOf' in value ||
    'allOf' in value
  );
};

const normalizeJsonSchema = (
  jsonSchema: Record<string, unknown>,
): { schema: Record<string, unknown>; changed: boolean } => {
  if (!jsonSchema || typeof jsonSchema !== 'object' || Array.isArray(jsonSchema)) {
    return { schema: jsonSchema, changed: false };
  }

  const typeValue = jsonSchema.type;
  const types = Array.isArray(typeValue)
    ? typeValue.filter((value): value is string => typeof value === 'string')
    : typeof typeValue === 'string'
      ? [typeValue]
      : [];

  const isObject = types.includes('object') || Boolean(jsonSchema.properties);
  if (!isObject) {
    return { schema: jsonSchema, changed: false };
  }

  const rawProperties = isRecord(jsonSchema.properties) ? (jsonSchema.properties as Record<string, unknown>) : {};
  const nextProperties: Record<string, unknown> = { ...rawProperties };
  const nextSchema: Record<string, unknown> = { ...jsonSchema };
  let changed = false;

  for (const [key, value] of Object.entries(jsonSchema)) {
    if (!key || key === 'properties') {
      continue;
    }
    if (key.startsWith('$') || key.startsWith('x-') || JSON_SCHEMA_KEYWORDS.has(key)) {
      continue;
    }
    if (!isRecord(value) || !looksLikeSchemaNode(value)) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(nextProperties, key)) {
      nextProperties[key] = value;
    }
    delete nextSchema[key];
    changed = true;
  }

  if (changed) {
    nextSchema.properties = nextProperties;
    return { schema: nextSchema, changed: true };
  }

  return { schema: jsonSchema, changed: false };
};

const isArraySchema = (schema: Record<string, unknown>): boolean => {
  const typeValue = schema.type;
  const types = Array.isArray(typeValue) ? typeValue : [typeValue];
  return types.includes('array') || Boolean(schema.items);
};

const isObjectSchema = (schema: Record<string, unknown>): boolean => {
  const typeValue = schema.type;
  const types = Array.isArray(typeValue) ? typeValue : [typeValue];
  return types.includes('object') || Boolean(schema.properties);
};

const getItemsSchema = (schema: Record<string, unknown>): Record<string, unknown> | null => {
  const items = schema.items;
  if (!items) {
    return null;
  }
  if (Array.isArray(items)) {
    const first = items[0];
    return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
  }
  return typeof items === 'object' ? (items as Record<string, unknown>) : null;
};

const deriveRequiredFields = (jsonSchema: Record<string, unknown>): string[] => {
  const fields = new Set<string>();

  const walk = (schema: Record<string, unknown> | null, prefix: string) => {
    if (!schema || typeof schema !== 'object') return;

    const typeValue = schema.type;
    const types = Array.isArray(typeValue)
      ? typeValue.filter((value): value is string => typeof value === 'string')
      : typeof typeValue === 'string'
        ? [typeValue]
        : [];
    const properties = schema.properties as Record<string, unknown> | undefined;
    const isObject = types.includes('object') || Boolean(properties);
    const isArray = types.includes('array') || Boolean(schema.items);

    if (isObject) {
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

    if (!isObject && isArray) {
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

const stableStringify = (value: unknown): string => {
  const normalize = (current: unknown): unknown => {
    if (Array.isArray(current)) {
      return current.map(normalize);
    }
    if (!isRecord(current)) {
      return current;
    }
    const record = current as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      next[key] = normalize(record[key]);
    }
    return next;
  };

  return JSON.stringify(normalize(value));
};

const computeSchemaVersion = (jsonSchema: Record<string, unknown>): string => {
  const hash = createHash('sha256');
  hash.update(stableStringify(jsonSchema));
  return hash.digest('hex');
};

export class AddSchemaProvenanceAndVersioning1705480000000 implements MigrationInterface {
  name = 'AddSchemaProvenanceAndVersioning1705480000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schemas"
        ADD COLUMN IF NOT EXISTS "schema_version" VARCHAR NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
        ADD COLUMN IF NOT EXISTS "schema_id" INT NULL,
        ADD COLUMN IF NOT EXISTS "schema_version" VARCHAR NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_schema_id"
        ON "jobs" ("schema_id");
    `);

    const schemas: Array<{ id: number; json_schema: unknown }> = await queryRunner.query(
      `SELECT id, json_schema FROM schemas`,
    );

    for (const row of schemas) {
      const raw = row.json_schema;
      if (!isRecord(raw)) {
        continue;
      }

      const normalized = normalizeJsonSchema(raw);
      const requiredFields = deriveRequiredFields(normalized.schema);
      const schemaVersion = computeSchemaVersion(normalized.schema);

      await queryRunner.query(
        `UPDATE schemas SET json_schema = $1, required_fields = $2, schema_version = $3 WHERE id = $4`,
        [normalized.schema, requiredFields, schemaVersion, row.id],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_jobs_schema_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
        DROP COLUMN IF EXISTS "schema_version",
        DROP COLUMN IF EXISTS "schema_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "schemas"
        DROP COLUMN IF EXISTS "schema_version";
    `);
  }
}

