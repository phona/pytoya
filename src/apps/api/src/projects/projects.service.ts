import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ModelEntity } from '../entities/model.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ProjectEntity } from '../entities/project.entity';
import { UserEntity } from '../entities/user.entity';
import { adapterRegistry } from '../models/adapters/adapter-registry';
import { ExtractorRepository } from '../extractors/extractor.repository';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectNotFoundException } from './exceptions/project-not-found.exception';
import { ProjectOwnershipException } from './exceptions/project-ownership.exception';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    private readonly extractorRepository: ExtractorRepository,
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
    totalExtractionCost: number;
    costByExtractor: Array<{
      extractorId: string | null;
      extractorName: string | null;
      totalCost: number;
      extractionCount: number;
      averageCost: number;
    }>;
    costOverTime: Array<{ date: string; extractionCost: number }>;
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

    const totals = await baseQuery
      .clone()
      .select('COALESCE(SUM(manifest.extractionCost), 0)', 'totalCost')
      .getRawOne<{ totalCost: string }>();
    const totalExtractionCost = Number(totals?.totalCost ?? 0);

    const costByExtractor = await baseQuery
      .clone()
      .leftJoin('manifest.textExtractor', 'extractor')
      .select('extractor.id', 'extractorId')
      .addSelect('extractor.name', 'extractorName')
      .addSelect('COUNT(*)', 'extractionCount')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'totalCost')
      .groupBy('extractor.id')
      .addGroupBy('extractor.name')
      .orderBy('extractor.name', 'ASC')
      .getRawMany<{ extractorId: string | null; extractorName: string | null; extractionCount: string; totalCost: string }>();

    const costOverTime = await baseQuery
      .clone()
      .select("TO_CHAR(manifest.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'extractionCost')
      .groupBy("TO_CHAR(manifest.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; extractionCost: string }>();

    return {
      projectId,
      totalExtractionCost,
      costByExtractor: costByExtractor.map((row) => {
        const totalCost = Number(row.totalCost);
        const extractionCount = Number(row.extractionCount);
        return {
          extractorId: row.extractorId,
          extractorName: row.extractorName,
          totalCost,
          extractionCount,
          averageCost: extractionCount ? totalCost / extractionCount : 0,
        };
      }),
      costOverTime: costOverTime.map((row) => ({
        date: row.date,
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
  ): Promise<void> {
    if (!input.llmModelId) {
      throw new BadRequestException('LLM model is required');
    }
    if (!input.textExtractorId) {
      throw new BadRequestException('Text extractor is required');
    }
    await Promise.all([
      this.ensureExtractorExists(input.textExtractorId),
      this.ensureModelExists(input.llmModelId, 'llm'),
    ]);
  }

  private async ensureModelExists(
    modelId: string | null | undefined,
    expectedCategory: 'ocr' | 'llm',
  ): Promise<void> {
    if (modelId === undefined || modelId === null) {
      return;
    }
    const model = await this.modelRepository.findOne({
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

  private async ensureExtractorExists(extractorId: string | null | undefined): Promise<void> {
    if (extractorId === undefined || extractorId === null) {
      return;
    }
    const extractor = await this.extractorRepository.findOne(extractorId);
    if (!extractor) {
      throw new NotFoundException(`Extractor ${extractorId} not found`);
    }
  }

}
