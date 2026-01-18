import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchemaEntity } from '../entities/schema.entity';
import { SchemaRuleEntity, SchemaRuleOperator } from '../entities/schema-rule.entity';
import { CreateSchemaRuleDto } from './dto/create-schema-rule.dto';
import { UpdateSchemaRuleDto } from './dto/update-schema-rule.dto';

@Injectable()
export class SchemaRulesService {
  constructor(
    @InjectRepository(SchemaRuleEntity)
    private readonly schemaRuleRepository: Repository<SchemaRuleEntity>,
    @InjectRepository(SchemaEntity)
    private readonly schemaRepository: Repository<SchemaEntity>,
  ) {}

  async create(
    schemaId: number,
    input: CreateSchemaRuleDto,
  ): Promise<SchemaRuleEntity> {
    await this.ensureSchemaExists(schemaId);
    if (input.schemaId && input.schemaId !== schemaId) {
      throw new BadRequestException('Schema ID mismatch');
    }

    const normalizedFieldPath = input.fieldPath?.trim() ?? '';
    const fieldPath = normalizedFieldPath || (input.ruleOperator === SchemaRuleOperator.OCR_CORRECTION ? '*' : '');
    if (!fieldPath) {
      throw new BadRequestException('fieldPath is required');
    }

    const rule = this.schemaRuleRepository.create({
      schemaId,
      fieldPath,
      ruleType: input.ruleType,
      ruleOperator: input.ruleOperator,
      ruleConfig: input.ruleConfig ?? {},
      errorMessage: input.errorMessage ?? null,
      priority: input.priority ?? 0,
      enabled: input.enabled ?? true,
      description: input.description ?? null,
    });

    return this.schemaRuleRepository.save(rule);
  }

  async findBySchema(schemaId: number): Promise<SchemaRuleEntity[]> {
    await this.ensureSchemaExists(schemaId);
    return this.schemaRuleRepository.find({
      where: { schemaId },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async update(
    schemaId: number,
    ruleId: number,
    input: UpdateSchemaRuleDto,
  ): Promise<SchemaRuleEntity> {
    const rule = await this.schemaRuleRepository.findOne({
      where: { id: ruleId, schemaId },
    });
    if (!rule) {
      throw new NotFoundException(`Schema rule ${ruleId} not found`);
    }

    if (input.schemaId && input.schemaId !== schemaId) {
      throw new BadRequestException('Schema ID mismatch');
    }

    let fieldPath = rule.fieldPath;
    if (input.fieldPath !== undefined) {
      const trimmed = input.fieldPath.trim();
      const operator = input.ruleOperator ?? rule.ruleOperator;
      if (!trimmed) {
        if (operator === SchemaRuleOperator.OCR_CORRECTION) {
          fieldPath = '*';
        } else {
          throw new BadRequestException('fieldPath is required');
        }
      } else {
        fieldPath = trimmed;
      }
    }

    Object.assign(rule, {
      fieldPath,
      ruleType: input.ruleType ?? rule.ruleType,
      ruleOperator: input.ruleOperator ?? rule.ruleOperator,
      ruleConfig: input.ruleConfig ?? rule.ruleConfig,
      errorMessage:
        input.errorMessage === undefined ? rule.errorMessage : input.errorMessage ?? null,
      priority: input.priority ?? rule.priority,
      enabled: input.enabled ?? rule.enabled,
      description:
        input.description === undefined ? rule.description : input.description ?? null,
    });

    return this.schemaRuleRepository.save(rule);
  }

  async remove(
    schemaId: number,
    ruleId: number,
  ): Promise<SchemaRuleEntity> {
    const rule = await this.schemaRuleRepository.findOne({
      where: { id: ruleId, schemaId },
    });
    if (!rule) {
      throw new NotFoundException(`Schema rule ${ruleId} not found`);
    }
    return this.schemaRuleRepository.remove(rule);
  }

  private async ensureSchemaExists(schemaId: number): Promise<void> {
    const schema = await this.schemaRepository.findOne({
      where: { id: schemaId },
    });
    if (!schema) {
      throw new NotFoundException(`Schema ${schemaId} not found`);
    }
  }
}
