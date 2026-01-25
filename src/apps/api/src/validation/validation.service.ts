import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';

import { ValidationScriptEntity, ValidationSeverity } from '../entities/validation-script.entity';
import { LlmChatMessage } from '../llm/llm.types';
import { LlmService } from '../llm/llm.service';
import { ModelEntity } from '../entities/model.entity';
import { ManifestEntity, ManifestStatus, ValidationResult, ValidationIssue } from '../entities/manifest.entity';
import { ProjectEntity } from '../entities/project.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { UserEntity } from '../entities/user.entity';
import { CreateValidationScriptDto } from './dto/create-validation-script.dto';
import { UpdateValidationScriptDto } from './dto/update-validation-script.dto';
import { RunValidationDto } from './dto/run-validation.dto';
import { BatchValidationDto } from './dto/batch-validation.dto';
import { TestValidationScriptDto, TestValidationScriptResponseDto } from './dto/test-validation-script.dto';
import { ValidationScriptNotFoundException } from './exceptions/validation-script-not-found.exception';
import { ScriptExecutorService } from './script-executor.service';
import { ProjectOwnershipException } from '../projects/exceptions/project-ownership.exception';
import { ManifestNotFoundException } from '../manifests/exceptions/manifest-not-found.exception';
import { adapterRegistry } from '../models/adapters/adapter-registry';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    @InjectRepository(ValidationScriptEntity)
    private readonly validationScriptRepository: Repository<ValidationScriptEntity>,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(SchemaEntity)
    private readonly schemaRepository: Repository<SchemaEntity>,
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    private readonly scriptExecutor: ScriptExecutorService,
    private readonly llmService: LlmService,
  ) {}

  // ========== Script CRUD ==========

  async create(user: UserEntity, input: CreateValidationScriptDto): Promise<ValidationScriptEntity> {
    // Verify project ownership
    const project = await this.projectRepository.findOne({
      where: { id: Number(input.projectId) },
    });

    if (!project) {
      throw new ProjectOwnershipException(Number(input.projectId));
    }

    if (project.ownerId !== user.id) {
      throw new ProjectOwnershipException(project.id);
    }

    // Validate script syntax
    const syntaxCheck = this.scriptExecutor.validateSyntax(input.script);
    if (!syntaxCheck.valid) {
      throw new BadRequestException(syntaxCheck.error);
    }

    const script = this.validationScriptRepository.create({
      ...input,
      projectId: project.id,
      severity: input.severity ?? ValidationSeverity.WARNING,
      enabled: input.enabled ?? true,
      description: input.description ?? null,
    });

    const saved = await this.validationScriptRepository.save(script);
    await this.invalidateValidationResultsForProject(project.id);
    return saved;
  }

  async findAll(user: UserEntity): Promise<ValidationScriptEntity[]> {
    return this.validationScriptRepository.find({
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProject(user: UserEntity, projectId: number): Promise<ValidationScriptEntity[]> {
    // Verify project ownership
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project || project.ownerId !== user.id) {
      throw new ProjectOwnershipException(projectId);
    }

    return this.validationScriptRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(user: UserEntity, id: number): Promise<ValidationScriptEntity> {
    const script = await this.validationScriptRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!script) {
      throw new ValidationScriptNotFoundException(id);
    }

    // Check ownership
    if (script.project.ownerId !== user.id) {
      throw new ProjectOwnershipException(script.projectId);
    }

    return script;
  }

  async update(user: UserEntity, id: number, input: UpdateValidationScriptDto): Promise<ValidationScriptEntity> {
    const script = await this.findOne(user, id);
    const projectId = script.projectId;

    // If script content is being updated, validate syntax
    if (input.script) {
      const syntaxCheck = this.scriptExecutor.validateSyntax(input.script);
      if (!syntaxCheck.valid) {
        throw new BadRequestException(syntaxCheck.error);
      }
    }

    Object.assign(script, input);

    const saved = await this.validationScriptRepository.save(script);
    await this.invalidateValidationResultsForProject(projectId);
    return saved;
  }

  async remove(user: UserEntity, id: number): Promise<ValidationScriptEntity> {
    const script = await this.findOne(user, id);
    const projectId = script.projectId;
    const removed = await this.validationScriptRepository.remove(script);
    await this.invalidateValidationResultsForProject(projectId);
    return removed;
  }

  // ========== Script Validation ==========

  validateScriptSyntax(script: string): { valid: boolean; error?: string } {
    return this.scriptExecutor.validateSyntax(script);
  }

  // ========== Validation Execution ==========

  async runValidation(user: UserEntity, input: RunValidationDto): Promise<ValidationResult> {
    const manifest = await this.manifestRepository.findOne({
      where: { id: input.manifestId },
      relations: ['group', 'group.project'],
    });

    if (!manifest) {
      throw new ManifestNotFoundException(input.manifestId);
    }

    // Verify ownership
    if (manifest.group.project.ownerId !== user.id) {
      throw new ProjectOwnershipException(manifest.group.projectId);
    }

    // Check if extraction is complete
    if (manifest.status !== ManifestStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot validate manifest that has not completed extraction',
      );
    }

    if (!manifest.extractedData) {
      throw new BadRequestException('No extracted data to validate');
    }

    // Get scripts to run
    const scripts = await this.getScriptsToRun(
      user,
      manifest.group.projectId,
      input.scriptIds,
    );

    const schemaId = manifest.group.project.defaultSchemaId ?? null;
    const schemaVersion = schemaId
      ? (await this.schemaRepository.findOne({ where: { id: schemaId } }))?.schemaVersion ?? null
      : null;
    const validationScriptIds = scripts.map((script) => script.id).sort((a, b) => a - b);
    const validationScriptsVersion = this.computeValidationScriptsVersion(scripts);

    // Run all enabled scripts
    const allIssues: ValidationIssue[] = [];
    for (const script of scripts) {
      try {
        const issues = await this.scriptExecutor.executeScript(
          script.script,
          manifest.extractedData,
        );
        allIssues.push(...issues);
      } catch (error) {
        this.logger.error(
          `Script ${script.id} (${script.name}) execution failed:`,
          error,
        );
        const message =
          error instanceof Error ? error.message : 'Unknown script execution error';

        allIssues.push({
          field: '__script__',
          message: `Validation script "${script.name}" (id=${script.id}) failed: ${message}. This is a script implementation error.`,
          severity: 'error',
        });
      }
    }

    const result = this.buildValidationResult(allIssues, {
      schemaId,
      schemaVersion,
      validationScriptsVersion,
      validationScriptIds,
    });

    // Cache results in manifest
    await this.manifestRepository.update(input.manifestId, {
      validationResults: result,
    });

    return result;
  }

  async runBatchValidation(
    user: UserEntity,
    input: BatchValidationDto,
  ): Promise<Map<number, ValidationResult>> {
    const results = new Map<number, ValidationResult>();

    for (const manifestId of input.manifestIds) {
      try {
        const result = await this.runValidation(user, {
          manifestId,
          scriptIds: input.scriptIds,
        });
        results.set(manifestId, result);
      } catch (error) {
        this.logger.error(`Validation failed for manifest ${manifestId}:`, error);
        // Continue with other manifests
      }
    }

    return results;
  }

  // ========== Helper Methods ==========

  private async getScriptsToRun(
    user: UserEntity,
    projectId: number,
    scriptIds?: number[],
  ): Promise<ValidationScriptEntity[]> {
    if (scriptIds && scriptIds.length > 0) {
      // Run specific scripts
      const scripts: ValidationScriptEntity[] = [];
      for (const id of scriptIds) {
        try {
          const script = await this.findOne(user, id);
          if (script.enabled) {
            scripts.push(script);
          }
        } catch (error) {
          this.logger.warn(`Could not load script ${id}:`, error);
        }
      }
      return scripts;
    }

    // Run all enabled scripts for the project
    return this.validationScriptRepository.find({
      where: { projectId, enabled: true },
    });
  }

  private buildValidationResult(
    issues: ValidationIssue[],
    provenance?: {
      schemaId: number | null;
      schemaVersion: string | null;
      validationScriptsVersion: string | null;
      validationScriptIds: number[];
    },
  ): ValidationResult {
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    return {
      issues,
      errorCount,
      warningCount,
      validatedAt: new Date().toISOString(),
      schemaId: provenance?.schemaId ?? null,
      schemaVersion: provenance?.schemaVersion ?? null,
      validationScriptsVersion: provenance?.validationScriptsVersion ?? null,
      validationScriptIds: provenance?.validationScriptIds ?? [],
    };
  }

  private computeValidationScriptsVersion(scripts: ValidationScriptEntity[]): string | null {
    if (!scripts.length) {
      return null;
    }

    const material = scripts
      .map((script) => ({
        id: script.id,
        enabled: script.enabled,
        severity: script.severity,
        updatedAt: script.updatedAt ? new Date(script.updatedAt).toISOString() : null,
        script: script.script,
      }))
      .sort((a, b) => a.id - b.id);

    const hash = createHash('sha256');
    hash.update(JSON.stringify(material));
    return hash.digest('hex');
  }

  private async invalidateValidationResultsForProject(projectId: number): Promise<void> {
    await this.manifestRepository.query(
      `UPDATE manifests SET validation_results = NULL WHERE group_id IN (SELECT id FROM groups WHERE project_id = $1)`,
      [projectId],
    );
  }

  // ========== Script Testing (Debug Panel) ==========

  async testValidationScript(input: TestValidationScriptDto): Promise<TestValidationScriptResponseDto> {
    const syntaxCheck = this.scriptExecutor.validateSyntax(input.script);
    if (!syntaxCheck.valid) {
      throw new BadRequestException(syntaxCheck.error);
    }

    const debug = input.debug ?? true;

    if (!debug) {
      const issues = await this.scriptExecutor.executeScript(input.script, input.extractedData);
      return { result: this.buildValidationResult(issues) };
    }

    const { issues, logs, runtimeError } = await this.scriptExecutor.executeScriptWithDebug(
      input.script,
      input.extractedData,
    );

    const allIssues: ValidationIssue[] = [...issues];
    if (runtimeError) {
      allIssues.push({
        field: '__script__',
        message: `Validation script test failed: ${runtimeError.message}`,
        severity: 'error',
      });
    }

    return {
      result: this.buildValidationResult(allIssues),
      debug: { logs },
      runtimeError,
    };
  }

  // ========== LLM Generation ==========

  async generateScriptTemplate(input: {
    llmModelId: string;
    prompt: string;
    structured: Record<string, unknown>;
  }): Promise<{ name: string; description: string; severity: ValidationSeverity; script: string }> {
    const model = await this.modelRepository.findOne({
      where: { id: input.llmModelId },
    });

    if (!model) {
      throw new BadRequestException(`Model ${input.llmModelId} not found`);
    }

    const schema = adapterRegistry.getSchema(model.adapterType);
    if (!schema || schema.category !== 'llm') {
      throw new BadRequestException(`Model ${input.llmModelId} is not a valid LLM model`);
    }

    const messages: LlmChatMessage[] = [
      {
        role: 'system',
        content:
          'You generate extracted-data validation scripts. Return JSON only with fields: name, description, severity, script. ' +
          'severity must be "warning" or "error". script must define function validate(extractedData) that returns an array of issues.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          structured: input.structured,
          prompt: input.prompt,
        }),
      },
    ];

    const completion = await this.llmService.createChatCompletion(
      messages,
      {
        responseFormat: { type: 'json_object' },
        maxTokens: 1200,
      },
      this.buildLlmProviderConfig(model),
    );

    const parsed = this.parseJsonObject(completion.content);
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
    const severity = parsed.severity === 'error' ? ValidationSeverity.ERROR : ValidationSeverity.WARNING;
    const script = typeof parsed.script === 'string' ? parsed.script.trim() : '';

    if (!name || !script) {
      throw new BadRequestException('Generated script response is missing required fields');
    }

    return { name, description, severity, script };
  }

  private parseJsonObject(content: string): Record<string, unknown> {
    const trimmed = content.trim();
    const sanitized = trimmed.startsWith('```')
      ? trimmed
          .replace(/^```json\n?/, '')
          .replace(/^```[a-zA-Z]*\n?/, '')
          .replace(/```$/, '')
          .trim()
      : trimmed;

    const parsed = JSON.parse(sanitized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('Invalid LLM response: expected JSON object');
    }
    return parsed as Record<string, unknown>;
  }

  private buildLlmProviderConfig(model: ModelEntity) {
    const parameters = model.parameters ?? {};
    return {
      type: model.adapterType,
      baseUrl: this.getStringParam(parameters, 'baseUrl'),
      apiKey: this.getStringParam(parameters, 'apiKey'),
      modelName: this.getStringParam(parameters, 'modelName'),
      temperature: this.getNumberParam(parameters, 'temperature'),
      maxTokens: this.getNumberParam(parameters, 'maxTokens'),
      supportsStructuredOutput: this.getBooleanParam(parameters, 'supportsStructuredOutput'),
      supportsVision: this.getBooleanParam(parameters, 'supportsVision'),
    };
  }

  private getStringParam(
    parameters: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = parameters[key];
    return typeof value === 'string' ? value : undefined;
  }

  private getNumberParam(
    parameters: Record<string, unknown>,
    key: string,
  ): number | undefined {
    const value = parameters[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private getBooleanParam(
    parameters: Record<string, unknown>,
    key: string,
  ): boolean | undefined {
    const value = parameters[key];
    return typeof value === 'boolean' ? value : undefined;
  }
}
