import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Ajv from 'ajv';
import { Repository } from 'typeorm';

import { SchemaEntity } from '../entities/schema.entity';
import { CreateSchemaDto } from './dto/create-schema.dto';
import { UpdateSchemaDto } from './dto/update-schema.dto';
import { ValidateSchemaDto } from './dto/validate-schema.dto';
import { SchemaNotFoundException } from './exceptions/schema-not-found.exception';

@Injectable()
export class SchemasService {
  private ajv: Ajv;

  constructor(
    @InjectRepository(SchemaEntity)
    private readonly schemaRepository: Repository<SchemaEntity>,
  ) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
  }

  async create(input: CreateSchemaDto): Promise<SchemaEntity> {
    const name = this.deriveSchemaName(input.jsonSchema, input.projectId);
    const description = this.deriveSchemaDescription(input.jsonSchema);
    const requiredFields = this.deriveRequiredFields(input.jsonSchema);
    const schema = this.schemaRepository.create({
      jsonSchema: input.jsonSchema,
      projectId: input.projectId,
      extractionStrategy: input.extractionStrategy,
      name,
      description,
      requiredFields,
      systemPromptTemplate: input.systemPromptTemplate ?? null,
      validationSettings: input.validationSettings ?? null,
    });
    return this.schemaRepository.save(schema);
  }

  async findAll(): Promise<SchemaEntity[]> {
    return this.schemaRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<SchemaEntity> {
    const schema = await this.schemaRepository.findOne({
      where: { id },
    });

    if (!schema) {
      throw new SchemaNotFoundException(id);
    }

    return schema;
  }

  async findByProject(projectId: number): Promise<SchemaEntity[]> {
    return this.schemaRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: number,
    input: UpdateSchemaDto,
  ): Promise<SchemaEntity> {
    const schema = await this.findOne(id);
    const nextJsonSchema = input.jsonSchema ?? schema.jsonSchema;
    const nextProjectId = input.projectId ?? schema.projectId;
    const requiredFields = this.deriveRequiredFields(nextJsonSchema);
    const name = this.deriveSchemaName(nextJsonSchema, nextProjectId, schema.name);
    const description = this.deriveSchemaDescription(nextJsonSchema);

    Object.assign(schema, {
      name,
      jsonSchema: nextJsonSchema,
      projectId: nextProjectId,
      extractionStrategy: input.extractionStrategy ?? schema.extractionStrategy,
      description,
      requiredFields,
      systemPromptTemplate:
        input.systemPromptTemplate ?? schema.systemPromptTemplate,
      validationSettings:
        input.validationSettings ?? schema.validationSettings,
    });

    return this.schemaRepository.save(schema);
  }

  async remove(id: number): Promise<SchemaEntity> {
    const schema = await this.findOne(id);
    return this.schemaRepository.remove(schema);
  }

  validateSchemaDefinition(
    jsonSchema: Record<string, unknown>,
  ): { valid: boolean; errors?: Array<{ message: string; path?: string }> } {
    try {
      const valid = this.ajv.validateSchema(jsonSchema);
      if (valid) {
        return { valid: true };
      }

      const errors = this.ajv.errors?.map((err) => ({
        message: err.message ?? 'Invalid schema',
        path: err.instancePath || err.schemaPath || undefined,
      })) ?? [];

      return { valid: false, errors };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid schema';
      return { valid: false, errors: [{ message }] };
    }
  }

  validateData(dto: ValidateSchemaDto): { valid: boolean; errors?: string[] } {
    if (!dto.data) {
      throw new BadRequestException('Validation data is required');
    }
    const validate = this.ajv.compile(dto.jsonSchema);
    const valid = validate(dto.data);

    if (valid) {
      return { valid: true };
    }

    const errors = validate.errors?.map((err) => {
      const path = err.instancePath || 'root';
      return `${path}: ${err.message}`;
    }) ?? [];

    return { valid: false, errors };
  }

  validateWithRequiredFields(
    dto: ValidateSchemaDto,
  ): { valid: boolean; errors?: string[] } {
    const result = this.validateData(dto);

    if (!result.valid) {
      return result;
    }

    // Check required fields
    const errors: string[] = result.errors ?? [];
    const requiredFields = this.deriveRequiredFields(dto.jsonSchema);

    for (const field of requiredFields) {
      const value = this.getNestedValue(dto.data!, field);
      if (value === undefined || value === null || value === '') {
        errors.push(`Required field '${field}' is missing or empty`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  parseSchemaContent(
    content: string,
  ): { valid: boolean; jsonSchema?: Record<string, unknown>; errors?: Array<{ message: string; line?: number; column?: number }> } {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      return { valid: true, jsonSchema: parsed };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid JSON';
      const positionMatch = message.match(/position\s+(\d+)/i);
      const position = positionMatch ? Number(positionMatch[1]) : undefined;
      const lineColumn = position !== undefined
        ? this.getLineColumnFromPosition(content, position)
        : undefined;

      return {
        valid: false,
        errors: [
          {
            message,
            line: lineColumn?.line,
            column: lineColumn?.column,
          },
        ],
      };
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.').filter(Boolean);
    const readPath = (current: unknown, index: number): unknown => {
      if (index >= parts.length) {
        return current;
      }
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      const part = parts[index];
      const anyMatch = part.match(/(.+)\[\]$/);
      if (anyMatch) {
        const key = anyMatch[1];
        const objValue = (current as Record<string, unknown>)[key];
        if (!Array.isArray(objValue) || objValue.length === 0) {
          return undefined;
        }
        if (index === parts.length - 1) {
          return objValue;
        }
        for (const item of objValue) {
          const result = readPath(item, index + 1);
          if (result !== undefined) {
            return result;
          }
        }
        return undefined;
      }
      const arrayMatch = part.match(/(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const key = arrayMatch[1];
        const arrayIndex = Number.parseInt(arrayMatch[2], 10);
        const objValue = (current as Record<string, unknown>)[key];
        if (!Array.isArray(objValue) || arrayIndex >= objValue.length) {
          return undefined;
        }
        return readPath(objValue[arrayIndex], index + 1);
      }

      const objValue = (current as Record<string, unknown>)[part];
      if (!(part in (current as Record<string, unknown>))) {
        return undefined;
      }
      return readPath(objValue, index + 1);
    };

    return readPath(obj, 0);
  }

  private deriveSchemaName(
    jsonSchema: Record<string, unknown>,
    projectId: number,
    fallbackName?: string,
  ): string {
    const title = typeof jsonSchema.title === 'string' ? jsonSchema.title.trim() : '';
    if (title) {
      return title;
    }
    if (fallbackName?.trim()) {
      return fallbackName.trim();
    }
    return `Schema ${projectId}`;
  }

  private deriveSchemaDescription(jsonSchema: Record<string, unknown>): string | null {
    const description =
      typeof jsonSchema.description === 'string' ? jsonSchema.description.trim() : '';
    return description || null;
  }

  private deriveRequiredFields(jsonSchema: Record<string, unknown>): string[] {
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
            if (this.isArraySchema(propSchemaObj)) {
              const itemsSchema = this.getItemsSchema(propSchemaObj);
              if (itemsSchema) {
                walk(itemsSchema, `${path}[]`);
              }
            } else if (this.isObjectSchema(propSchemaObj)) {
              walk(propSchemaObj, path);
            }
          }
        }
      }

      if (!isObject && isArray) {
        const itemsSchema = this.getItemsSchema(schema);
        if (itemsSchema) {
          const nextPrefix = prefix ? `${prefix}[]` : '[]';
          walk(itemsSchema, nextPrefix);
        }
      }
    };

    walk(jsonSchema, '');

    return Array.from(fields);
  }

  private isObjectSchema(schema: Record<string, unknown>): boolean {
    const typeValue = schema.type;
    const types = Array.isArray(typeValue) ? typeValue : [typeValue];
    return types.includes('object') || Boolean(schema.properties);
  }

  private isArraySchema(schema: Record<string, unknown>): boolean {
    const typeValue = schema.type;
    const types = Array.isArray(typeValue) ? typeValue : [typeValue];
    return types.includes('array') || Boolean(schema.items);
  }

  private getItemsSchema(schema: Record<string, unknown>): Record<string, unknown> | null {
    const items = schema.items;
    if (!items) {
      return null;
    }
    if (Array.isArray(items)) {
      const first = items[0];
      return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
    }
    return typeof items === 'object' ? (items as Record<string, unknown>) : null;
  }

  private getLineColumnFromPosition(
    content: string,
    position: number,
  ): { line: number; column: number } {
    const lines = content.slice(0, position).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1]?.length + 1;
    return { line, column };
  }
}
