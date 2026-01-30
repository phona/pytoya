import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Ajv from 'ajv';
import { EntityManager, Repository } from 'typeorm';
import { createHash } from 'crypto';

import { AbilityFactory } from '../auth/casl/ability.factory';
import { APP_ACTIONS, APP_SUBJECTS } from '../auth/casl/casl.types';
import { SchemaEntity } from '../entities/schema.entity';
import { ProjectEntity } from '../entities/project.entity';
import { SchemaRuleEntity } from '../entities/schema-rule.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { ProjectOwnershipException } from '../projects/exceptions/project-ownership.exception';
import { CreateSchemaDto } from './dto/create-schema.dto';
import { UpdateSchemaDto } from './dto/update-schema.dto';
import { ValidateSchemaDto } from './dto/validate-schema.dto';
import { SchemaNotFoundException } from './exceptions/schema-not-found.exception';

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

@Injectable()
export class SchemasService {
  private ajv: Ajv;

  constructor(
    @InjectRepository(SchemaEntity)
    private readonly schemaRepository: Repository<SchemaEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(SchemaRuleEntity)
    private readonly schemaRuleRepository: Repository<SchemaRuleEntity>,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    private readonly abilityFactory: AbilityFactory,
  ) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
  }

  async create(user: UserEntity, input: CreateSchemaDto): Promise<SchemaEntity> {
    return this.createWithManager(user, input);
  }

  async createWithManager(
    user: UserEntity,
    input: CreateSchemaDto,
    options: { manager?: EntityManager } = {},
  ): Promise<SchemaEntity> {
    const schemaRepository = options.manager
      ? options.manager.getRepository(SchemaEntity)
      : this.schemaRepository;
    const projectRepository = options.manager
      ? options.manager.getRepository(ProjectEntity)
      : this.projectRepository;

    const { schema: jsonSchema } = this.normalizeJsonSchema(input.jsonSchema);
    const name = this.deriveSchemaName(jsonSchema, input.projectId);
    const description = this.deriveSchemaDescription(jsonSchema);
    const requiredFields = this.deriveRequiredFields(jsonSchema);
    const schemaVersion = this.computeSchemaVersion(jsonSchema);

    const project = await projectRepository.findOne({
      where: { id: input.projectId },
    });
    if (!project) {
      throw new BadRequestException(`Project ${input.projectId} not found`);
    }

    this.assertCanManageSchema(user, project.ownerId, project.id);
    const schema = schemaRepository.create({
      jsonSchema,
      projectId: input.projectId,
      name,
      description,
      requiredFields,
      schemaVersion,
      systemPromptTemplate: input.systemPromptTemplate ?? null,
      validationSettings: input.validationSettings ?? null,
    });
    const saved = await schemaRepository.save(schema);
    if (!project.defaultSchemaId) {
      await projectRepository.update(project.id, {
        defaultSchemaId: saved.id,
      });
    }
    return saved;
  }

  async findAll(user: UserEntity): Promise<SchemaEntity[]> {
    if (user.role === UserRole.ADMIN) {
      return this.schemaRepository.find({
        order: { createdAt: 'DESC' },
      });
    }

    return this.schemaRepository
      .createQueryBuilder('schema')
      .leftJoin('schema.project', 'project')
      .where('project.ownerId = :ownerId', { ownerId: user.id })
      .orderBy('schema.createdAt', 'DESC')
      .getMany();
  }

  async findOne(user: UserEntity, id: number): Promise<SchemaEntity> {
    const schema = await this.schemaRepository.findOne({
      where: { id },
    });

    if (!schema) {
      throw new SchemaNotFoundException(id);
    }

    const project = await this.projectRepository.findOne({
      where: { id: schema.projectId },
    });
    if (!project) {
      throw new BadRequestException(`Project ${schema.projectId} not found`);
    }

    this.assertCanManageSchema(user, project.ownerId, project.id);
    return schema;
  }

  async findOneInternal(id: number): Promise<SchemaEntity> {
    const schema = await this.schemaRepository.findOne({
      where: { id },
    });

    if (!schema) {
      throw new SchemaNotFoundException(id);
    }

    return schema;
  }

  async findByProject(user: UserEntity, projectId: number): Promise<SchemaEntity[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new BadRequestException(`Project ${projectId} not found`);
    }

    this.assertCanManageSchema(user, project.ownerId, project.id);
    return this.schemaRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    user: UserEntity,
    id: number,
    input: UpdateSchemaDto,
  ): Promise<SchemaEntity> {
    const schema = await this.findOne(user, id);
    const nextJsonSchemaRaw = input.jsonSchema ?? schema.jsonSchema;
    const normalized = this.normalizeJsonSchema(nextJsonSchemaRaw as Record<string, unknown>);
    const nextJsonSchema = normalized.schema;
    const nextProjectId = input.projectId ?? schema.projectId;
    const nextProject = await this.projectRepository.findOne({
      where: { id: nextProjectId },
    });
    if (!nextProject) {
      throw new BadRequestException(`Project ${nextProjectId} not found`);
    }

    this.assertCanManageSchema(user, nextProject.ownerId, nextProject.id);
    const requiredFields = this.deriveRequiredFields(nextJsonSchema);
    const name = this.deriveSchemaName(nextJsonSchema, nextProjectId, schema.name);
    const description = this.deriveSchemaDescription(nextJsonSchema);
    const schemaVersion = this.computeSchemaVersion(nextJsonSchema);

    const next = this.schemaRepository.create({
      name,
      jsonSchema: nextJsonSchema,
      projectId: nextProjectId,
      description,
      requiredFields,
      schemaVersion,
      systemPromptTemplate:
        input.systemPromptTemplate ?? schema.systemPromptTemplate,
      validationSettings:
        input.validationSettings ?? schema.validationSettings,
    });

    const saved = await this.schemaRepository.save(next);

    const existingRules = await this.schemaRuleRepository.find({
      where: { schemaId: schema.id },
    });
    if (existingRules.length > 0) {
      const cloned = existingRules.map((rule) =>
        this.schemaRuleRepository.create({
          schemaId: saved.id,
          fieldPath: rule.fieldPath,
          ruleType: rule.ruleType,
          ruleOperator: rule.ruleOperator,
          ruleConfig: rule.ruleConfig,
          errorMessage: rule.errorMessage,
          priority: rule.priority,
          enabled: rule.enabled,
          description: rule.description,
        }),
      );
      await this.schemaRuleRepository.save(cloned);
    }

    if (!nextProject.defaultSchemaId || nextProject.defaultSchemaId === schema.id) {
      await this.projectRepository.update(nextProject.id, {
        defaultSchemaId: saved.id,
      });
    }

    if (schema.projectId !== nextProjectId) {
      await this.invalidateValidationResultsForProject(schema.projectId);
    }
    await this.invalidateValidationResultsForProject(nextProjectId);

    return saved;
  }

  private normalizeJsonSchema(jsonSchema: Record<string, unknown>): { schema: Record<string, unknown>; changed: boolean } {
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
      if (!isRecord(value) || !this.looksLikeSchemaNode(value)) {
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
  }

  private looksLikeSchemaNode(value: Record<string, unknown>): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const record = value as Record<string, unknown>;
    return (
      'type' in record ||
      'properties' in record ||
      'items' in record ||
      '$ref' in record ||
      'oneOf' in record ||
      'anyOf' in record ||
      'allOf' in record
    );
  }

  async remove(user: UserEntity, id: number): Promise<SchemaEntity> {
    const schema = await this.findOne(user, id);
    return this.schemaRepository.remove(schema);
  }

  private assertCanManageSchema(user: UserEntity, projectOwnerId: number, projectId: number) {
    const ability = this.abilityFactory.createForUser(user);
    const allowed = ability.can(
      APP_ACTIONS.MANAGE,
      this.abilityFactory.subject(APP_SUBJECTS.SCHEMA, { projectOwnerId }),
    );
    if (!allowed) {
      throw new ProjectOwnershipException(projectId);
    }
  }

  private computeSchemaVersion(jsonSchema: Record<string, unknown>): string {
    const stable = this.stableStringify(jsonSchema);
    const hash = createHash('sha256');
    hash.update(stable);
    return hash.digest('hex');
  }

  private stableStringify(value: unknown): string {
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
  }

  private async invalidateValidationResultsForProject(projectId: number): Promise<void> {
    await this.manifestRepository.query(
      `UPDATE manifests SET validation_results = NULL WHERE group_id IN (SELECT id FROM groups WHERE project_id = $1)`,
      [projectId],
    );
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
  ): { valid: boolean; errors?: string[]; missingFields?: string[] } {
    if (!dto.data) {
      throw new BadRequestException('Validation data is required');
    }

    const validate = this.ajv.compile(dto.jsonSchema);
    const valid = validate(dto.data);

    const errors =
      validate.errors?.map((err) => {
        const path = err.instancePath || 'root';
        return `${path}: ${err.message}`;
      }) ?? [];

    const missingFieldsFromAjv =
      validate.errors
        ?.filter((err) => err.keyword === 'required')
        .map((err) => {
          const missingProperty = (err.params as Record<string, unknown> | undefined)?.[
            'missingProperty'
          ] as string | undefined;
          if (!missingProperty) {
            return null;
          }
          const instancePath = (err.instancePath ?? '').replace(/^\//, '').replace(/\//g, '.');
          return instancePath ? `${instancePath}.${missingProperty}` : missingProperty;
        })
        .filter(Boolean) as string[] | undefined;

    if (!valid) {
      return {
        valid: false,
        errors: errors.length > 0 ? errors : undefined,
        missingFields: missingFieldsFromAjv && missingFieldsFromAjv.length > 0 ? missingFieldsFromAjv : undefined,
      };
    }

    // Check required fields
    const missingFields: string[] = [];
    const requiredFields = this.deriveRequiredFields(dto.jsonSchema);

    for (const field of requiredFields) {
      const value = this.getNestedValue(dto.data!, field);
      if (value === undefined || value === null || value === '') {
        errors.push(`Required field '${field}' is missing or empty`);
        missingFields.push(field);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
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
