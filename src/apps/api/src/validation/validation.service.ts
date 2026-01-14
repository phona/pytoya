import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ValidationScriptEntity, ValidationSeverity } from '../entities/validation-script.entity';
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

// Validation Script Templates
export const VALIDATION_TEMPLATES: Array<{
  name: string;
  description: string;
  script: string;
  severity: ValidationSeverity;
}> = [
  {
    name: 'Tax Calculation Check',
    description: 'Validates that unit prices with tax match expected calculations (13% VAT)',
    script: `function validate(extractedData) {
  const issues = [];
  const taxRate = 0.13; // 13% VAT

  for (const [i, item] of (extractedData.items || []).entries()) {
    const exTax = item.unit_price_ex_tax || 0;
    const incTax = item.unit_price_inc_tax || 0;
    const expected = exTax * (1 + taxRate);
    const diff = Math.abs(expected - incTax);

    if (diff > 0.01) {
      issues.push({
        field: \`items[\${i}].unit_price_inc_tax\`,
        message: \`Tax mismatch: expected \${expected.toFixed(2)}, got \${incTax}\`,
        severity: 'warning',
        actual: incTax,
        expected: expected,
      });
    }
  }
  return issues;
}`,
    severity: ValidationSeverity.WARNING,
  },
  {
    name: 'Invoice Totals Check',
    description: 'Verifies that the sum of line item totals matches the invoice total',
    script: `function validate(extractedData) {
  const issues = [];
  const items = extractedData.items || [];

  const calculatedTotal = items.reduce((sum, item) =>
    sum + (item.total_amount_inc_tax || 0), 0
  );

  const statedTotal = extractedData.invoice?.total_amount_inc_tax || 0;
  const diff = Math.abs(calculatedTotal - statedTotal);

  if (diff > 0.05) {
    issues.push({
      field: 'invoice.total_amount_inc_tax',
      message: \`Sum mismatch: items total \${calculatedTotal.toFixed(2)}, invoice total \${statedTotal.toFixed(2)}\`,
      severity: 'error',
      actual: statedTotal,
      expected: calculatedTotal,
    });
  }

  return issues;
}`,
    severity: ValidationSeverity.ERROR,
  },
  {
    name: 'Required Fields Check',
    description: 'Ensures critical invoice fields are present and non-empty',
    script: `function validate(extractedData) {
  const issues = [];
  const requiredFields = [
    'invoice.po_no',
    'invoice.invoice_date',
    'invoice.supplier_name',
    'department.code',
  ];

  for (const field of requiredFields) {
    const value = getNestedValue(extractedData, field);
    if (value === undefined || value === null || value === '') {
      issues.push({
        field: field,
        message: \`Required field '\${field}' is missing or empty\`,
        severity: 'error',
      });
    }
  }

  return issues;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}`,
    severity: ValidationSeverity.ERROR,
  },
  {
    name: 'Date Range Check',
    description: 'Validates that invoice date is within expected ranges',
    script: `function validate(extractedData) {
  const issues = [];

  const invoiceDateStr = extractedData.invoice?.invoice_date;
  if (!invoiceDateStr) {
    return issues;
  }

  const invoiceDate = new Date(invoiceDateStr);
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  if (isNaN(invoiceDate.getTime())) {
    issues.push({
      field: 'invoice.invoice_date',
      message: 'Invalid date format',
      severity: 'error',
      actual: invoiceDateStr,
    });
  } else if (invoiceDate > today) {
    issues.push({
      field: 'invoice.invoice_date',
      message: 'Invoice date is in the future',
      severity: 'warning',
      actual: invoiceDateStr,
      expected: 'Today or earlier',
    });
  } else if (invoiceDate < oneYearAgo) {
    issues.push({
      field: 'invoice.invoice_date',
      message: 'Invoice date is more than one year old',
      severity: 'warning',
      actual: invoiceDateStr,
    });
  }

  return issues;
}`,
    severity: ValidationSeverity.WARNING,
  },
];

@Injectable()
export class ValidationService implements OnModuleInit {
  private readonly logger = new Logger(ValidationService.name);

  async onModuleInit() {
    // Seed templates on module initialization
    await this.seedTemplates();
  }

  constructor(
    @InjectRepository(ValidationScriptEntity)
    private readonly validationScriptRepository: Repository<ValidationScriptEntity>,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly scriptExecutor: ScriptExecutorService,
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
      throw new Error(syntaxCheck.error);
    }

    const script = this.validationScriptRepository.create({
      ...input,
      projectId: project.id,
      severity: input.severity ?? ValidationSeverity.WARNING,
      enabled: input.enabled ?? true,
      isTemplate: input.isTemplate ?? false,
      description: input.description ?? null,
    });

    return this.validationScriptRepository.save(script);
  }

  async findAll(user: UserEntity): Promise<ValidationScriptEntity[]> {
    return this.validationScriptRepository.find({
      where: { isTemplate: false },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findTemplates(): Promise<ValidationScriptEntity[]> {
    return this.validationScriptRepository.find({
      where: { isTemplate: true },
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
      where: { projectId, isTemplate: false },
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

    // Check ownership (unless it's a template)
    if (!script.isTemplate && script.project.ownerId !== user.id) {
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
        throw new Error(syntaxCheck.error);
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
      throw new Error('Cannot validate manifest that has not completed extraction');
    }

    if (!manifest.extractedData) {
      throw new Error('No extracted data to validate');
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

  // ========== Template Seeding ==========

  async seedTemplates(): Promise<void> {
    const existingTemplates = await this.validationScriptRepository.find({
      where: { isTemplate: true },
    });

    if (existingTemplates.length > 0) {
      this.logger.log('Templates already exist, skipping seed');
      return;
    }

    this.logger.log('Seeding validation script templates...');

    for (const template of VALIDATION_TEMPLATES) {
      const script = this.validationScriptRepository.create({
        ...template,
        projectId: 0, // Templates use project ID 0
        enabled: true,
        isTemplate: true,
      });
      await this.validationScriptRepository.save(script);
    }

    this.logger.log(`Seeded ${VALIDATION_TEMPLATES.length} validation script templates`);
  }
}
