import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';

import { ManifestEntity, ManifestStatus } from '../entities/manifest.entity';
import { ProviderEntity } from '../entities/provider.entity';
import { PromptEntity, PromptType } from '../entities/prompt.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { LlmResponseFormat } from '../llm/llm.types';
import { LlmService } from '../llm/llm.service';
import { LlmChatMessage, LlmProviderConfig } from '../llm/llm.types';
import { OcrService } from '../ocr/ocr.service';
import { PromptsService } from '../prompts/prompts.service';
import { SchemasService } from '../schemas/schemas.service';
import { ExtractedData } from '../prompts/types/prompts.types';
import {
  ExtractionStateResult,
  ExtractionStatus,
  ExtractionValidationResult,
  ExtractionWorkflowState,
  OcrState,
} from './extraction.types';

type ExtractionOptions = {
  provider?: ProviderEntity;
  prompt?: PromptEntity;
  reExtractPrompt?: PromptEntity;
  providerId?: number;
  promptId?: number;
};

const DEFAULT_REQUIRED_FIELDS = [
  'department.code',
  'invoice.po_no',
  'invoice.invoice_date',
  'items',
  '_extraction_info',
];

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(PromptEntity)
    private readonly promptRepository: Repository<PromptEntity>,
    private readonly ocrService: OcrService,
    private readonly llmService: LlmService,
    private readonly promptsService: PromptsService,
    private readonly schemasService: SchemasService,
    private readonly configService: ConfigService,
  ) {}

  async runExtraction(
    manifestId: number,
    options: ExtractionOptions = {},
    onProgress?: (progress: number) => void,
  ): Promise<ExtractionWorkflowState> {
    const manifest = await this.manifestRepository.findOne({
      where: { id: manifestId },
      relations: [
        'group',
        'group.project',
      ],
    });

    if (!manifest) {
      throw new Error(`Manifest ${manifestId} not found`);
    }

    const reportProgress = this.buildProgressReporter(onProgress);
    reportProgress(5);

    const project = manifest.group?.project ?? null;

    // Load schema from project
    let schema: SchemaEntity | null = null;
    if (project?.defaultSchemaId) {
      try {
        schema = await this.schemasService.findOne(project.defaultSchemaId);
      } catch (error) {
        this.logger.warn(`Default schema ${project.defaultSchemaId} not found, using fallback`);
      }
    }

    const defaultProviderId = this.parseOptionalNumber(
      project?.defaultProviderId ?? null,
    );
    const providerFromProject = defaultProviderId
      ? await this.providerRepository.findOne({
          where: { id: defaultProviderId },
        })
      : null;
    const providerFromId = options.providerId
      ? await this.providerRepository.findOne({
          where: { id: options.providerId },
        })
      : null;
    if (options.providerId && !providerFromId) {
      throw new Error(`Provider ${options.providerId} not found`);
    }
    const provider =
      options.provider ??
      providerFromId ??
      providerFromProject ??
      undefined;

    const defaultPromptId = this.parseOptionalNumber(
      project?.defaultPromptId ?? null,
    );
    const promptFromProject = defaultPromptId
      ? await this.promptRepository.findOne({
          where: { id: defaultPromptId },
        })
      : null;
    const promptFromId = options.promptId
      ? await this.promptRepository.findOne({
          where: { id: options.promptId },
        })
      : null;
    if (options.promptId && !promptFromId) {
      throw new Error(`Prompt ${options.promptId} not found`);
    }
    const systemPrompt =
      options.prompt ??
      promptFromId ??
      promptFromProject ??
      undefined;
    const reExtractPrompt =
      options.reExtractPrompt ??
      options.prompt ??
      promptFromId ??
      promptFromProject ??
      undefined;

    const state: ExtractionWorkflowState = {
      manifestId: manifest.id,
      status: ExtractionStatus.PENDING,
      errors: [],
      maxRetries: this.getNumberConfig(
        'WORKFLOW_MAX_RETRIES',
        3,
      ),
      ocrRetryCount: 0,
      extractionRetryCount: 0,
    };

    await this.updateManifestStatus(manifest, ManifestStatus.PROCESSING);

    try {
      state.status = ExtractionStatus.VALIDATING;
      reportProgress(10);
      await this.validateManifest(manifest, state);

      const fileBuffer = await fs.readFile(manifest.storagePath);
      state.ocrResult = await this.executeOcr(fileBuffer, state);
      reportProgress(40);

      await this.retryOcrIfNeeded(fileBuffer, state);

      await this.runExtractionLoop(
        manifest,
        fileBuffer,
        state,
        {
          ...options,
          provider,
          prompt: systemPrompt,
          reExtractPrompt,
        },
        schema,
      );
      reportProgress(80);

      state.status = ExtractionStatus.SAVING;
      reportProgress(90);
      await this.saveResult(manifest, state);
      state.status = ExtractionStatus.COMPLETED;
      reportProgress(100);

      return state;
    } catch (error) {
      const message = this.formatError(error);
      this.logger.error(`Extraction workflow failed: ${message}`);
      state.errors.push(message);
      state.currentError = message;
      state.status = ExtractionStatus.FAILED;
      await this.updateManifestStatus(manifest, ManifestStatus.FAILED);
      throw error;
    }
  }

  private async runExtractionLoop(
    manifest: ManifestEntity,
    fileBuffer: Buffer,
    state: ExtractionWorkflowState,
    options: ExtractionOptions,
    schema: SchemaEntity | null,
  ): Promise<void> {
    // Get required fields from schema or fall back to defaults
    const requiredFields = schema?.requiredFields ?? this.getRequiredFields();
    const providerConfig = this.buildProviderConfig(options.provider);
    const systemPrompt = this.getSystemPrompt(options.prompt);
    const reExtractSystemPrompt = this.getReExtractPrompt(
      options.reExtractPrompt ?? options.prompt,
    );

    while (true) {
      state.status =
        state.extractionRetryCount > 0
          ? ExtractionStatus.EXTRACTION_RETRY
          : ExtractionStatus.EXTRACTING;

      const extractionResult = await this.executeExtraction(
        state,
        providerConfig,
        systemPrompt,
        reExtractSystemPrompt,
        requiredFields,
        schema,
      );
      state.extractionResult = extractionResult;

      if (extractionResult.success) {
        return;
      }

      const shouldRetryOcr = this.shouldRetryOcrOnValidation(
        extractionResult,
        state,
      );

      if (shouldRetryOcr) {
        state.extractionResult = undefined;
        await this.delayWithBackoff(state.ocrRetryCount);
        state.ocrResult = await this.executeOcr(fileBuffer, state);
        await this.retryOcrIfNeeded(fileBuffer, state);
      } else if (this.canRetryExtraction(state)) {
        await this.delayWithBackoff(state.extractionRetryCount);
      } else {
        const error =
          extractionResult.error ??
          'Extraction failed after retries';
        throw new Error(error);
      }
    }
  }

  private async validateManifest(
    manifest: ManifestEntity,
    state: ExtractionWorkflowState,
  ): Promise<void> {
    const filePath = manifest.storagePath;
    const fileExt = path.extname(manifest.originalFilename).toLowerCase();

    if (fileExt !== '.pdf') {
      this.raiseError(
        state,
        `Manifest file is not a PDF: ${manifest.originalFilename}`,
      );
    }

    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        this.raiseError(
          state,
          `Manifest file path is not a file: ${filePath}`,
        );
      }
      if (stats.size === 0) {
        this.raiseError(
          state,
          `Manifest file is empty: ${filePath}`,
        );
      }
    } catch (error) {
      this.raiseError(
        state,
        `Manifest file not accessible: ${this.formatError(error)}`,
      );
    }
  }

  private async executeOcr(
    fileBuffer: Buffer,
    state: ExtractionWorkflowState,
  ): Promise<OcrState> {
    this.logger.log(
      `Starting OCR (attempt ${state.ocrRetryCount + 1})`,
    );
    state.status =
      state.ocrRetryCount > 0
        ? ExtractionStatus.OCR_RETRY
        : ExtractionStatus.OCR_PROCESSING;

    try {
      const ocrResult = await this.ocrService.processPdf(
        fileBuffer,
      );

      return {
        rawText: ocrResult.raw_text,
        markdown: ocrResult.markdown,
        layout: ocrResult.layout,
        success: true,
        retryCount: state.ocrRetryCount,
      };
    } catch (error) {
      const errorMessage = `OCR processing failed: ${this.formatError(
        error,
      )}`;
      this.logger.warn(errorMessage);
      return {
        rawText: '',
        markdown: '',
        success: false,
        error: errorMessage,
        retryCount: state.ocrRetryCount,
      };
    }
  }

  private async retryOcrIfNeeded(
    fileBuffer: Buffer,
    state: ExtractionWorkflowState,
  ): Promise<void> {
    while (state.ocrResult && !state.ocrResult.success) {
      if (!this.canRetryOcr(state)) {
        throw new Error(
          state.ocrResult.error ??
            'OCR failed after retries',
        );
      }

      state.ocrRetryCount += 1;
      await this.delayWithBackoff(state.ocrRetryCount);
      state.ocrResult = await this.executeOcr(fileBuffer, state);
    }
  }

  private async executeExtraction(
    state: ExtractionWorkflowState,
    providerConfig: LlmProviderConfig | undefined,
    systemPrompt: string,
    reExtractSystemPrompt: string,
    requiredFields: string[],
    schema: SchemaEntity | null,
  ): Promise<ExtractionStateResult> {
    const ocrResult = state.ocrResult;
    if (!ocrResult || !ocrResult.success) {
      return {
        data: {},
        success: false,
        error: 'Cannot extract data: OCR processing failed',
        retryCount: state.extractionRetryCount,
      };
    }

    const previousExtraction = state.extractionResult;
    const useReExtract =
      state.extractionRetryCount > 0 && Boolean(previousExtraction);
    const prompt =
      useReExtract && previousExtraction
        ? this.promptsService.buildReExtractPrompt(
            ocrResult.markdown,
            previousExtraction.data,
            previousExtraction.validation?.missingFields,
            previousExtraction.error,
          )
        : this.promptsService.buildExtractionPrompt(
            ocrResult.markdown,
          );

    const messages: LlmChatMessage[] = [
      {
        role: 'system',
        content: useReExtract ? reExtractSystemPrompt : systemPrompt,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Build LLM options with structured output if supported
    const llmOptions: {
      responseFormat?: LlmResponseFormat;
    } = {};

    if (schema && providerConfig) {
      const supportsStructuredOutput = this.llmService.providerSupportsStructuredOutput(
        providerConfig.type,
        providerConfig.modelName ?? undefined,
      );
      if (supportsStructuredOutput) {
        // Use native structured output with JSON Schema
        llmOptions.responseFormat = {
          type: 'json_schema',
          json_schema: {
            name: 'extracted_data',
            description: 'Extracted data from the document',
            strict: false,
            schema: schema.jsonSchema as Record<string, unknown>,
          },
        };
        this.logger.log(`Using structured output for extraction with schema: ${schema.name}`);
      }
    }

    try {
      const completion = await this.llmService.createChatCompletion(
        messages,
        llmOptions,
        providerConfig,
      );
      const data = this.parseJsonResult(completion.content);

      // Use ajv validation if schema is provided, otherwise use basic validation
      let validation: ExtractionValidationResult;
      if (schema) {
        const ajvResult = this.schemasService.validateWithRequiredFields({
          jsonSchema: schema.jsonSchema as Record<string, unknown>,
          data,
          requiredFields: schema.requiredFields,
        });
        validation = {
          valid: ajvResult.valid,
          missingFields: [],
          errors: ajvResult.errors ?? [],
        };
      } else {
        validation = this.validateResult(data, requiredFields);
      }

      if (!validation.valid) {
        return {
          data,
          success: false,
          error: validation.errors.join('; '),
          retryCount: state.extractionRetryCount,
          validation,
        };
      }

      return {
        data,
        success: true,
        retryCount: state.extractionRetryCount,
        validation,
      };
    } catch (error) {
      return {
        data: {},
        success: false,
        error: `Data extraction failed: ${this.formatError(error)}`,
        retryCount: state.extractionRetryCount,
      };
    }
  }

  private async saveResult(
    manifest: ManifestEntity,
    state: ExtractionWorkflowState,
  ): Promise<void> {
    const extraction = state.extractionResult;
    if (!extraction || !extraction.success) {
      throw new Error('Cannot save: extraction failed');
    }

    manifest.extractedData = extraction.data;
    const confidence =
      (extraction.data._extraction_info as Record<string, unknown> | undefined)
        ?.confidence as number | undefined;
    if (confidence !== undefined) {
      manifest.confidence = confidence;
    }

    manifest.status = ManifestStatus.COMPLETED;
    await this.manifestRepository.save(manifest);
  }

  private async updateManifestStatus(
    manifest: ManifestEntity,
    status: ManifestStatus,
  ): Promise<void> {
    manifest.status = status;
    await this.manifestRepository.save(manifest);
  }

  private buildProviderConfig(
    provider?: ProviderEntity,
  ): LlmProviderConfig | undefined {
    if (!provider) {
      return undefined;
    }

    return {
      type: provider.type,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      modelName: provider.modelName,
      temperature: provider.temperature,
      maxTokens: provider.maxTokens,
    };
  }

  private parseOptionalNumber(value?: string | null): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getSystemPrompt(prompt?: PromptEntity): string {
    if (prompt?.type === PromptType.SYSTEM && prompt.content) {
      return prompt.content;
    }
    return this.promptsService.getSystemPrompt();
  }

  private getReExtractPrompt(prompt?: PromptEntity): string {
    if (prompt?.type === PromptType.RE_EXTRACT && prompt.content) {
      return prompt.content;
    }
    return this.promptsService.getReExtractSystemPrompt();
  }

  private validateResult(
    data: Record<string, unknown>,
    requiredFields: string[],
  ): ExtractionValidationResult {
    const result: ExtractionValidationResult = {
      valid: true,
      missingFields: [],
      errors: [],
    };

    for (const fieldPath of requiredFields) {
      const nullable = fieldPath.endsWith('?');
      const actualPath = nullable
        ? fieldPath.slice(0, -1)
        : fieldPath;
      const { exists, value } = this.checkFieldExistsWithValue(
        data,
        actualPath,
      );

      if (nullable) {
        if (!exists) {
          result.valid = false;
          result.missingFields.push(actualPath);
          result.errors.push(
            `Missing nullable field: ${actualPath}`,
          );
        }
      } else if (!exists) {
        result.valid = false;
        result.missingFields.push(actualPath);
        result.errors.push(
          `Missing required field: ${actualPath}`,
        );
      } else if (value === undefined) {
        result.valid = false;
        result.missingFields.push(actualPath);
        result.errors.push(
          `Required field empty: ${actualPath}`,
        );
      }
    }

    const items = data.items;
    if (!Array.isArray(items) || items.length === 0) {
      result.valid = false;
      result.errors.push('No items found in extraction');
    }

    return result;
  }

  private checkFieldExistsWithValue(
    data: Record<string, unknown>,
    fieldPath: string,
  ): { exists: boolean; value?: unknown } {
    const parts = fieldPath.split('.');
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || typeof current !== 'object') {
        return { exists: false };
      }

      const arrayMatch = part.match(/(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const key = arrayMatch[1];
        const index = Number.parseInt(arrayMatch[2], 10);
        const obj = current as Record<string, unknown>;
        const value = obj[key];
        if (!Array.isArray(value) || index >= value.length) {
          return { exists: false };
        }
        current = value[index];
        continue;
      }

      const obj = current as Record<string, unknown>;
      if (!(part in obj)) {
        return { exists: false };
      }

      current = obj[part];
    }

    if (current === null) {
      return { exists: true, value: null };
    }

    if (typeof current === 'string' && !current.trim()) {
      return { exists: false };
    }

    return { exists: true, value: current };
  }

  private parseJsonResult(content: string): Record<string, unknown> {
    const sanitized = this.stripJsonCodeFence(content);
    const parsed = JSON.parse(sanitized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid extraction result: not an object');
    }
    return parsed as Record<string, unknown>;
  }

  private stripJsonCodeFence(content: string): string {
    const trimmed = content.trim();
    if (!trimmed.startsWith('```')) {
      return trimmed;
    }

    return trimmed
      .replace(/^```json\n?/, '')
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/```$/, '')
      .trim();
  }

  private shouldRetryOcrOnValidation(
    extractionResult: ExtractionStateResult,
    state: ExtractionWorkflowState,
  ): boolean {
    const retryOcrOnMissing =
      this.getBooleanConfig(
        'WORKFLOW_RETRY_OCR_ON_MISSING_FIELDS',
        true,
      ) &&
      this.canRetryOcr(state);

    if (!retryOcrOnMissing) {
      return false;
    }

    const missingFields =
      extractionResult.validation?.missingFields ?? [];
    if (missingFields.length === 0) {
      return false;
    }

    const hasOcrContent =
      state.ocrResult?.success &&
      Boolean(state.ocrResult.rawText.trim());
    if (hasOcrContent) {
      return false;
    }

    state.ocrRetryCount += 1;
    return true;
  }

  private canRetryOcr(state: ExtractionWorkflowState): boolean {
    return (
      this.getBooleanConfig('WORKFLOW_ENABLE_OCR_RETRY', true) &&
      state.ocrRetryCount < state.maxRetries
    );
  }

  private canRetryExtraction(
    state: ExtractionWorkflowState,
  ): boolean {
    if (
      !this.getBooleanConfig(
        'WORKFLOW_ENABLE_EXTRACTION_RETRY',
        true,
      )
    ) {
      return false;
    }

    state.extractionRetryCount += 1;
    return state.extractionRetryCount <= state.maxRetries;
  }

  private async delayWithBackoff(retryCount: number): Promise<void> {
    const baseDelaySeconds = this.getNumberConfig(
      'WORKFLOW_RETRY_DELAY_BASE',
      2,
    );
    const delayMs =
      baseDelaySeconds * 1000 * 2 ** (retryCount - 1);
    this.logger.warn(`Retrying in ${delayMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  private getRequiredFields(): string[] {
    const raw = this.configService.get<string>(
      'EXTRACTION_REQUIRED_FIELDS',
    );
    if (!raw) {
      return DEFAULT_REQUIRED_FIELDS;
    }

    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (value): value is string => typeof value === 'string',
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse EXTRACTION_REQUIRED_FIELDS JSON: ${this.formatError(
            error,
          )}`,
        );
      }
    }

    return trimmed
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private raiseError(
    state: ExtractionWorkflowState,
    message: string,
  ): never {
    state.errors.push(message);
    state.currentError = message;
    throw new Error(message);
  }

  private getBooleanConfig(
    key: string,
    defaultValue: boolean,
  ): boolean {
    const raw = this.configService.get<string | boolean>(key);
    if (raw === undefined || raw === null) {
      return defaultValue;
    }
    if (typeof raw === 'boolean') {
      return raw;
    }
    return raw.toLowerCase() === 'true';
  }

  private getNumberConfig(key: string, fallback: number): number {
    const raw = this.configService.get<string | number>(key);
    if (raw === undefined || raw === null) {
      return fallback;
    }
    const value =
      typeof raw === 'number' ? raw : Number.parseFloat(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private buildProgressReporter(
    onProgress?: (progress: number) => void,
  ): (progress: number) => void {
    if (!onProgress) {
      return () => undefined;
    }

    return (progress: number) => {
      const normalized = Math.round(progress);
      if (normalized < 0) {
        onProgress(0);
        return;
      }
      if (normalized > 100) {
        onProgress(100);
        return;
      }
      onProgress(normalized);
    };
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error ?? 'Unknown error');
  }
}
