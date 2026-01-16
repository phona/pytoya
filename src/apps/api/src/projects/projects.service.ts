import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ModelEntity } from '../entities/model.entity';
import { ProjectEntity } from '../entities/project.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { UserEntity } from '../entities/user.entity';
import { PromptNotFoundException } from '../prompts/exceptions/prompt-not-found.exception';
import { adapterRegistry } from '../models/adapters/adapter-registry';
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
    @InjectRepository(PromptEntity)
    private readonly promptRepository: Repository<PromptEntity>,
  ) {}

  async create(
    user: UserEntity,
    input: CreateProjectDto,
  ): Promise<ProjectEntity> {
    await this.ensureDefaultsExist(input);
    const project = this.projectRepository.create({
      ...input,
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
    await this.ensureDefaultsExist(input);
    Object.assign(project, input);

    return this.projectRepository.save(project);
  }

  async remove(user: UserEntity, id: number): Promise<ProjectEntity> {
    const project = await this.findOne(user, id);
    return this.projectRepository.remove(project);
  }

  private async ensureDefaultsExist(
    input: Pick<
      UpdateProjectDto,
      'ocrModelId' | 'llmModelId' | 'defaultPromptId'
    >,
  ): Promise<void> {
    await Promise.all([
      this.ensureModelExists(input.ocrModelId, 'ocr'),
      this.ensureModelExists(input.llmModelId, 'llm'),
      this.ensurePromptExists(input.defaultPromptId),
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

  private async ensurePromptExists(
    defaultPromptId?: string | null,
  ): Promise<void> {
    if (defaultPromptId === undefined || defaultPromptId === null) {
      return;
    }
    const promptId = Number(defaultPromptId);
    if (!Number.isFinite(promptId)) {
      throw new PromptNotFoundException(defaultPromptId);
    }
    const prompt = await this.promptRepository.findOne({
      where: { id: promptId },
    });
    if (!prompt) {
      throw new PromptNotFoundException(defaultPromptId);
    }
  }
}
