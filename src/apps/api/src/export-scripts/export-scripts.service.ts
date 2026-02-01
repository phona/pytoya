import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportScriptEntity } from '../entities/export-script.entity';
import { ProjectEntity } from '../entities/project.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { ProjectOwnershipException } from '../projects/exceptions/project-ownership.exception';
import { CreateExportScriptDto } from './dto/create-export-script.dto';
import { UpdateExportScriptDto } from './dto/update-export-script.dto';
import type { ExportScriptFormat, TestExportScriptResponseDto } from './dto/test-export-script.dto';
import { ExportScriptNotFoundException } from './exceptions/export-script-not-found.exception';
import { ExportScriptExecutorService, ExportScriptContext } from './export-script-executor.service';

const buildDotPathGet = (root: unknown, path: string): unknown => {
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes('[]')) return undefined;
  const parts = trimmed.split('.').filter(Boolean);
  let current: unknown = root;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const buildDotPathSet = (root: unknown, path: string, value: unknown): void => {
  const trimmed = path.trim();
  if (!trimmed) return;
  if (!root || typeof root !== 'object' || Array.isArray(root)) return;
  if (trimmed.includes('[]')) return;

  const parts = trimmed.split('.').filter(Boolean);
  if (parts.length === 0) return;

  let current = root as Record<string, unknown>;
  for (let index = 0; index < parts.length; index += 1) {
    const key = parts[index];
    const isLast = index === parts.length - 1;
    if (isLast) {
      current[key] = value;
      return;
    }
    const next = current[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
};

const trimToNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeWhitespace = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed : null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

@Injectable()
export class ExportScriptsService {
  constructor(
    @InjectRepository(ExportScriptEntity)
    private readonly exportScriptRepository: Repository<ExportScriptEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly executor: ExportScriptExecutorService,
  ) {}

  async create(user: UserEntity, input: CreateExportScriptDto): Promise<ExportScriptEntity> {
    const project = await this.projectRepository.findOne({ where: { id: Number(input.projectId) } });
    if (!project) {
      throw new ProjectOwnershipException(Number(input.projectId));
    }
    if (user.role !== UserRole.ADMIN && project.ownerId !== user.id) {
      throw new ProjectOwnershipException(project.id);
    }

    const syntaxCheck = this.executor.validateSyntax(input.script);
    if (!syntaxCheck.valid) {
      throw new BadRequestException(syntaxCheck.error);
    }

    const script = this.exportScriptRepository.create({
      name: input.name,
      description: input.description ?? null,
      projectId: project.id,
      script: input.script,
      enabled: input.enabled ?? true,
      priority: input.priority ?? 0,
    });
    return this.exportScriptRepository.save(script);
  }

  async findAll(user: UserEntity): Promise<ExportScriptEntity[]> {
    if (user.role === UserRole.ADMIN) {
      return this.exportScriptRepository.find({ relations: ['project'], order: { createdAt: 'DESC' } });
    }

    return this.exportScriptRepository
      .createQueryBuilder('script')
      .leftJoinAndSelect('script.project', 'project')
      .where('project.ownerId = :ownerId', { ownerId: user.id })
      .orderBy('script.createdAt', 'DESC')
      .getMany();
  }

  async findByProject(user: UserEntity, projectId: number): Promise<ExportScriptEntity[]> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project || (user.role !== UserRole.ADMIN && project.ownerId !== user.id)) {
      throw new ProjectOwnershipException(projectId);
    }

    return this.exportScriptRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(user: UserEntity, id: number): Promise<ExportScriptEntity> {
    const script = await this.exportScriptRepository.findOne({ where: { id }, relations: ['project'] });
    if (!script) {
      throw new ExportScriptNotFoundException(id);
    }
    if (user.role !== UserRole.ADMIN && script.project.ownerId !== user.id) {
      throw new ProjectOwnershipException(script.projectId);
    }
    return script;
  }

  async update(user: UserEntity, id: number, input: UpdateExportScriptDto): Promise<ExportScriptEntity> {
    const script = await this.findOne(user, id);
    if (input.script) {
      const syntaxCheck = this.executor.validateSyntax(input.script);
      if (!syntaxCheck.valid) {
        throw new BadRequestException(syntaxCheck.error);
      }
    }

    Object.assign(script, input);
    return this.exportScriptRepository.save(script);
  }

  async remove(user: UserEntity, id: number): Promise<ExportScriptEntity> {
    const script = await this.findOne(user, id);
    return this.exportScriptRepository.remove(script);
  }

  validateScriptSyntax(script: string): { valid: boolean; error?: string } {
    return this.executor.validateSyntax(script);
  }

  async testExportScript(input: { script: string; extractedData: Record<string, unknown>; debug?: boolean; format?: ExportScriptFormat }): Promise<TestExportScriptResponseDto> {
    const ctx: ExportScriptContext = {
      format: input.format ?? 'csv',
      schemaColumns: [],
      project: { id: 0, name: 'Test Project' },
      manifest: { id: 0 },
      utils: {
        get: (obj, path) => buildDotPathGet(obj, path),
        set: (obj, path, value) => buildDotPathSet(obj, path, value),
        trimToNull,
        normalizeWhitespace,
        toNumberOrNull,
      },
    };

    if (input.debug) {
      const result = await this.executor.executeExportRowsWithDebug(input.script, input.extractedData as any, ctx);
      return {
        rows: result.rows,
        debug: { logs: result.logs },
        runtimeError: result.runtimeError,
      };
    }

    const rows = await this.executor.executeExportRows(input.script, input.extractedData as any, ctx);
    return { rows };
  }

  async findEnabledByProjectId(projectId: number): Promise<ExportScriptEntity[]> {
    return this.exportScriptRepository.find({
      where: { projectId, enabled: true },
      order: { priority: 'DESC', id: 'ASC' },
    });
  }

  async exportRowsForManifest(options: {
    format: ExportScriptFormat;
    schemaColumns: string[];
    project: { id: number; name?: string };
    manifest: {
      id: number;
      groupName?: string;
      createdAt?: Date | null;
      originalFilename?: string | null;
      status?: string | null;
      confidence?: number | null;
      humanVerified?: boolean | null;
      extractionCost?: number | null;
      extractionCostCurrency?: string | null;
    };
    extractedData: Record<string, unknown> | null;
  }): Promise<Array<Record<string, unknown>>> {
    const scripts = await this.findEnabledByProjectId(options.project.id);
    if (scripts.length === 0) {
      return [(options.extractedData ?? {}) as Record<string, unknown>];
    }

    const ctx: ExportScriptContext = {
      format: options.format,
      schemaColumns: options.schemaColumns,
      project: { id: options.project.id, name: options.project.name },
      manifest: {
        id: options.manifest.id,
        groupName: options.manifest.groupName ?? undefined,
        createdAt: options.manifest.createdAt ? options.manifest.createdAt.toISOString() : undefined,
        originalFilename: options.manifest.originalFilename ?? undefined,
        status: options.manifest.status ?? undefined,
        confidence: options.manifest.confidence ?? null,
        humanVerified: options.manifest.humanVerified ?? undefined,
        extractionCost: options.manifest.extractionCost ?? null,
        extractionCostCurrency: options.manifest.extractionCostCurrency ?? null,
      },
      utils: {
        get: (obj, path) => buildDotPathGet(obj, path),
        set: (obj, path, value) => buildDotPathSet(obj, path, value),
        trimToNull,
        normalizeWhitespace,
        toNumberOrNull,
      },
    };

    let workItems: Array<Record<string, unknown>> = [(options.extractedData ?? {}) as Record<string, unknown>];

    for (const script of scripts) {
      const next: Array<Record<string, unknown>> = [];
      for (const item of workItems) {
        try {
          const rows = await this.executor.executeExportRows(script.script, item as any, ctx);
          next.push(...rows);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown export script error';
          throw new BadRequestException(`Export script ${script.id} (${script.name}) failed: ${message}`);
        }
      }
      workItems = next;
    }

    return workItems;
  }
}
