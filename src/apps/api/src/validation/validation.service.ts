import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ValidationScriptEntity, ValidationSeverity } from '../entities/validation-script.entity';
import { LlmChatMessage } from '../llm/llm.types';
import { LlmService } from '../llm/llm.service';
import { ProviderEntity } from '../entities/provider.entity';
import { ManifestEntity, ManifestStatus, ValidationResult, ValidationIssue } from '../entities/manifest.entity';
import { ProjectEntity } from '../entities/project.entity';
import { UserEntity } from '../entities/user.entity';
import { CreateValidationScriptDto } from './dto/create-validation-script.dto';
import { UpdateValidationScriptDto } from './dto/update-validation-script.dto';
import { RunValidationDto } from './dto/run-validation.dto';
import { BatchValidationDto } from './dto/batch-validation.dto';
import { ValidationScriptNotFoundException } from './exceptions/validation-script-not-found.exception';
import { ScriptExecutorService } from './script-executor.service';
import { ProjectOwnershipException } from '../projects/exceptions/project-ownership.exception';
import { ManifestNotFoundException } from '../manifests/exceptions/manifest-not-found.exception';

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
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
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

    return this.validationScriptRepository.save(script);
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

    // If script content is being updated, validate syntax
    if (input.script) {
      const syntaxCheck = this.scriptExecutor.validateSyntax(input.script);
      if (!syntaxCheck.valid) {
        throw new BadRequestException(syntaxCheck.error);
      }
    }

    Object.assign(script, input);

    return this.validationScriptRepository.save(script);
  }

  async remove(user: UserEntity, id: number): Promise<ValidationScriptEntity> {
    const script = await this.findOne(user, id);
    return this.validationScriptRepository.remove(script);
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
        // Continue with other scripts even if one fails
      }
    }

    const result = this.buildValidationResult(allIssues);

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

  private buildValidationResult(issues: ValidationIssue[]): ValidationResult {
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    return {
      issues,
      errorCount,
      warningCount,
      validatedAt: new Date().toISOString(),
    };
  }

  // ========== LLM Generation ==========

  async generateScriptTemplate(input: {
    providerId: number;
    prompt: string;
    structured: Record<string, unknown>;
  }): Promise<{ name: string; description: string; severity: ValidationSeverity; script: string }> {
    const provider = await this.providerRepository.findOne({
      where: { id: input.providerId },
    });

    if (!provider) {
      throw new BadRequestException(`Provider ${input.providerId} not found`);
    }

    const messages: LlmChatMessage[] = [
      {
        role: 'system',
        content:
          'You generate invoice validation scripts. Return JSON only with fields: name, description, severity, script. ' +
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
        temperature: 0.2,
        maxTokens: 1200,
      },
      {
        type: provider.type,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        modelName: provider.modelName,
        temperature: provider.temperature,
        maxTokens: provider.maxTokens,
        supportsStructuredOutput: provider.supportsStructuredOutput,
      },
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
}
