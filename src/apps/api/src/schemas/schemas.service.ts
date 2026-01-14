import { Injectable } from '@nestjs/common';
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
    const schema = this.schemaRepository.create({
      ...input,
      isTemplate: input.isTemplate ?? false,
      description: input.description ?? null,
      requiredFields: input.requiredFields ?? [],
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

  async findTemplates(): Promise<SchemaEntity[]> {
    return this.schemaRepository.find({
      where: { isTemplate: true },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: number,
    input: UpdateSchemaDto,
  ): Promise<SchemaEntity> {
    const schema = await this.findOne(id);

    Object.assign(schema, {
      ...input,
      projectId: input.projectId ?? schema.projectId,
      isTemplate: input.isTemplate ?? schema.isTemplate,
      description: input.description ?? schema.description,
      requiredFields: input.requiredFields ?? schema.requiredFields,
    });

    return this.schemaRepository.save(schema);
  }

  async remove(id: number): Promise<SchemaEntity> {
    const schema = await this.findOne(id);
    return this.schemaRepository.remove(schema);
  }

  validate(dto: ValidateSchemaDto): { valid: boolean; errors?: string[] } {
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
    const result = this.validate(dto);

    if (!result.valid) {
      return result;
    }

    // Check required fields
    const errors: string[] = result.errors ?? [];
    const requiredFields = dto.requiredFields ?? [];

    for (const field of requiredFields) {
      const value = this.getNestedValue(dto.data, field);
      if (value === undefined || value === null || value === '') {
        errors.push(`Required field '${field}' is missing or empty`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
    }, obj as unknown);
  }
}
