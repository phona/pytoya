import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { ExtractorEntity } from '../entities/extractor.entity';
import { ModelEntity } from '../entities/model.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ProjectEntity } from '../entities/project.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { UserEntity } from '../entities/user.entity';
import { adapterRegistry } from '../models/adapters/adapter-registry';
import { ExtractorRepository } from '../extractors/extractor.repository';
import { SchemasService } from '../schemas/schemas.service';
import { SchemaRulesService } from '../schemas/schema-rules.service';
import { ValidationService } from '../validation/validation.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectWizardDto } from './dto/create-project-wizard.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectNotFoundException } from './exceptions/project-not-found.exception';
import { ProjectOwnershipException } from './exceptions/project-ownership.exception';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    private readonly extractorRepository: ExtractorRepository,
    private readonly schemasService: SchemasService,
    private readonly schemaRulesService: SchemaRulesService,
    private readonly validationService: ValidationService,
  ) {}

  async create(
    user: UserEntity,
    input: CreateProjectDto,
  ): Promise<ProjectEntity> {
    const projectInput = input;
    await this.ensureDefaultsExist(projectInput);
    const project = this.projectRepository.create({
      ...projectInput,
      ownerId: user.id,
    });

    return this.projectRepository.save(project);
  }

  async createWizard(
    user: UserEntity,
    input: CreateProjectWizardDto,
  ): Promise<{ project: ProjectEntity; schema: SchemaEntity }> {
    const validation = this.schemasService.validateSchemaDefinition(input.jsonSchema);
    if (!validation.valid) {
      throw new BadRequestException((validation.errors ?? []).join('; ') || 'Invalid schema');
    }

    return this.dataSource.transaction(async (manager) => {
      await this.ensureDefaultsExist(input.project, { manager });

      const projectRepository = manager.getRepository(ProjectEntity);
      const project = projectRepository.create({
        ...input.project,
        ownerId: user.id,
      });
      const savedProject = await projectRepository.save(project);

      const schema = await this.schemasService.createWithManager(
        {
          jsonSchema: input.jsonSchema,
          projectId: savedProject.id,
        },
        { manager },
      );

      if (input.rules?.length) {
        await Promise.all(
          input.rules.map((rule) =>
            this.schemaRulesService.createWithManager(
              schema.id,
              {
                schemaId: schema.id,
                fieldPath: rule.fieldPath,
                ruleType: rule.ruleType,
                ruleOperator: rule.ruleOperator,
                ruleConfig: rule.ruleConfig ?? {},
                errorMessage: rule.errorMessage,
                priority: rule.priority,
                enabled: rule.enabled,
                description: rule.description,
              },
              { manager },
            ),
          ),
        );
      }

      if (input.validationScripts?.length) {
        await Promise.all(
          input.validationScripts.map((script) =>
            this.validationService.createWithManager(
              user,
              {
                name: script.name,
                description: script.description,
                projectId: String(savedProject.id),
                script: script.script,
                severity: script.severity,
                enabled: script.enabled,
              },
              { manager },
            ),
          ),
        );
      }

      return { project: savedProject, schema };
    });
  }

  async findAll(user: UserEntity): Promise<ProjectEntity[]> {
    return this.projectRepository.find({
      where: { ownerId: user.id },
      relations: ['groups'],
    });
  }

  async findOne(user: UserEntity, id: number): Promise<ProjectEntity> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['groups'],
    });

    if (!project) {
      throw new ProjectNotFoundException(id);
    }

    if (project.ownerId !== user.id) {
      throw new ProjectOwnershipException(id);
    }

    return project;
  }

  async update(
    user: UserEntity,
    id: number,
    input: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    const project = await this.findOne(user, id);
    const projectInput = input;
    await this.ensureDefaultsExist({
      textExtractorId:
        (projectInput.textExtractorId ?? project.textExtractorId) ?? undefined,
      llmModelId: projectInput.llmModelId ?? project.llmModelId,
    });
    Object.assign(project, projectInput);

    return this.projectRepository.save(project);
  }

  async remove(user: UserEntity, id: number): Promise<ProjectEntity> {
    const project = await this.findOne(user, id);
    return this.projectRepository.remove(project);
  }

  async updateExtractor(
    user: UserEntity,
    id: number,
    textExtractorId: string,
  ): Promise<ProjectEntity> {
    const project = await this.findOne(user, id);
    await this.ensureExtractorExists(textExtractorId);
    project.textExtractorId = textExtractorId;
    return this.projectRepository.save(project);
  }

  async getCostSummary(
    user: UserEntity,
    projectId: number,
    dateRange?: { from?: string; to?: string },
  ): Promise<{
    projectId: number;
    totalExtractionCost: number | null;
    currency?: string | null;
    totalsByCurrency?: Array<{ currency: string; totalExtractionCost: number }>;
    costByExtractor: Array<{
      extractorId: string | null;
      extractorName: string | null;
      currency: string;
      totalCost: number;
      extractionCount: number;
      averageCost: number;
    }>;
    costOverTime: Array<{ date: string; currency: string; extractionCost: number }>;
    dateRange?: { from: string; to: string };
  }> {
    await this.findOne(user, projectId);

    const baseQuery = this.manifestRepository
      .createQueryBuilder('manifest')
      .leftJoin('manifest.group', 'group')
      .leftJoin('group.project', 'project')
      .where('project.id = :projectId', { projectId })
      .andWhere('manifest.extractionCost IS NOT NULL');

    if (dateRange?.from) {
      baseQuery.andWhere('manifest.createdAt >= :from', { from: dateRange.from });
    }
    if (dateRange?.to) {
      baseQuery.andWhere('manifest.createdAt <= :to', { to: dateRange.to });
    }

    const totalsByCurrencyRows = await baseQuery
      .clone()
      .select(`COALESCE(manifest.extractionCostCurrency, 'unknown')`, 'currency')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'totalCost')
      .groupBy(`COALESCE(manifest.extractionCostCurrency, 'unknown')`)
      .orderBy('currency', 'ASC')
      .getRawMany<{ currency: string; totalCost: string }>();

    const totalsByCurrency = totalsByCurrencyRows.map((row) => ({
      currency: row.currency,
      totalExtractionCost: Number(row.totalCost ?? 0),
    }));

    const hasSingleCurrency = totalsByCurrency.length === 1;
    const totalExtractionCost = hasSingleCurrency
      ? totalsByCurrency[0].totalExtractionCost
      : null;
    const currency = hasSingleCurrency ? totalsByCurrency[0].currency : null;

    const costByExtractor = await baseQuery
      .clone()
      .leftJoin('manifest.textExtractor', 'extractor')
      .select('extractor.id', 'extractorId')
      .addSelect('extractor.name', 'extractorName')
      .addSelect(`COALESCE(manifest.extractionCostCurrency, 'unknown')`, 'currency')
      .addSelect('COUNT(*)', 'extractionCount')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'totalCost')
      .groupBy('extractor.id')
      .addGroupBy('extractor.name')
      .addGroupBy(`COALESCE(manifest.extractionCostCurrency, 'unknown')`)
      .orderBy('extractor.name', 'ASC')
      .addOrderBy('currency', 'ASC')
      .getRawMany<{ extractorId: string | null; extractorName: string | null; currency: string; extractionCount: string; totalCost: string }>();

    const costOverTime = await baseQuery
      .clone()
      .select("TO_CHAR(manifest.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect(`COALESCE(manifest.extractionCostCurrency, 'unknown')`, 'currency')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'extractionCost')
      .groupBy("TO_CHAR(manifest.createdAt, 'YYYY-MM-DD')")
      .addGroupBy(`COALESCE(manifest.extractionCostCurrency, 'unknown')`)
      .orderBy('date', 'ASC')
      .addOrderBy('currency', 'ASC')
      .getRawMany<{ date: string; currency: string; extractionCost: string }>();

    return {
      projectId,
      totalExtractionCost,
      currency,
      totalsByCurrency: totalsByCurrency.length > 1 ? totalsByCurrency : undefined,
      costByExtractor: costByExtractor.map((row) => {
        const totalCost = Number(row.totalCost);
        const extractionCount = Number(row.extractionCount);
        return {
          extractorId: row.extractorId,
          extractorName: row.extractorName,
          currency: row.currency,
          totalCost,
          extractionCount,
          averageCost: extractionCount ? totalCost / extractionCount : 0,
        };
      }),
      costOverTime: costOverTime.map((row) => ({
        date: row.date,
        currency: row.currency,
        extractionCost: Number(row.extractionCost),
      })),
      dateRange: dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined,
    };
  }

  private async ensureDefaultsExist(
    input: Pick<
      UpdateProjectDto,
      'textExtractorId' | 'llmModelId'
    >,
    options: { manager?: EntityManager } = {},
  ): Promise<void> {
    if (!input.llmModelId) {
      throw new BadRequestException('LLM model is required');
    }
    if (!input.textExtractorId) {
      throw new BadRequestException('Text extractor is required');
    }
    await Promise.all([
      this.ensureExtractorExists(input.textExtractorId, options),
      this.ensureModelExists(input.llmModelId, 'llm', options),
    ]);
  }

  private async ensureModelExists(
    modelId: string | null | undefined,
    expectedCategory: 'ocr' | 'llm',
    options: { manager?: EntityManager } = {},
  ): Promise<void> {
    if (modelId === undefined || modelId === null) {
      return;
    }
    const modelRepository = options.manager
      ? options.manager.getRepository(ModelEntity)
      : this.modelRepository;

    const model = await modelRepository.findOne({
      where: { id: modelId },
    });
    if (!model) {
      throw new NotFoundException(`Model ${modelId} not found`);
    }
    const schema = adapterRegistry.getSchema(model.adapterType);
    if (!schema) {
      throw new BadRequestException(
        `Model ${modelId} has unknown adapter type`,
      );
    }
    if (schema.category !== expectedCategory) {
      throw new BadRequestException(
        `Model ${modelId} is not a valid ${expectedCategory} model`,
      );
    }
  }

  private async ensureExtractorExists(
    extractorId: string | null | undefined,
    options: { manager?: EntityManager } = {},
  ): Promise<void> {
    if (extractorId === undefined || extractorId === null) {
      return;
    }

    const extractor = options.manager
      ? await options.manager.getRepository(ExtractorEntity).findOne({ where: { id: extractorId } })
      : await this.extractorRepository.findOne(extractorId);

    if (!extractor) {
      throw new NotFoundException(`Extractor ${extractorId} not found`);
    }
  }

}
