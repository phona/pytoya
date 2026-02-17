import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { Repository } from 'typeorm';

import { ManifestEntity, ManifestStatus, FileType } from '../entities/manifest.entity';
import { ModelEntity } from '../entities/model.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { SchemaRuleEntity } from '../entities/schema-rule.entity';
import { ExtractorEntity } from '../entities/extractor.entity';
import { LlmResponseFormat, LlmChatMessage, LlmProviderConfig } from '../llm/llm.types';
import { LlmService } from '../llm/llm.service';
import { PromptBuilderService } from '../prompts/prompt-builder.service';
import { PromptsService } from '../prompts/prompts.service';
import { SchemaRulesService } from '../schemas/schema-rules.service';
import { SchemasService } from '../schemas/schemas.service';
import { IFileAccessService } from '../file-access/file-access.service';
import { ExtractedData } from '../prompts/types/prompts.types';
import { ModelPricingService } from '../models/model-pricing.service';
import { TextExtractorService } from '../text-extractor/text-extractor.service';
import { PricingConfig, TextExtractionMetadata, TextExtractionProgressUpdate } from '../text-extractor/types/extractor.types';
import { OcrResultDto } from '../manifests/dto/ocr-result.dto';
import { ManifestsService } from '../manifests/manifests.service';
import {
  applyMinimumCharge,
  calculateTokenCostNano,
  multiplyNanoAmounts,
  nanoToNumber,
  numberToNano,
} from '../common/cost/nano';
import {
  ExtractionStateResult,
  ExtractionStatus,
  ExtractionValidationResult,
  ExtractionWorkflowState,
  TextExtractionState,
} from './extraction.types';
import { adapterRegistry } from '../models/adapters/adapter-registry';
import { OcrContextTooLargeError } from './extraction.errors';

type ExtractionOptions = {
  llmModel?: ModelEntity;
  llmModelId?: string;
  queueJobId?: string;
  promptId?: number;
  systemPromptOverride?: string;
  reExtractPromptOverride?: string;
  fieldName?: string;
  customPrompt?: string;
  textContextSnippet?: string;
  onTextProgress?: (update: TextExtractionProgressUpdate) => void | Promise<void>;
};

type StageLogExtras = {
  manifestId?: number;
  jobId?: string;
  durationMs?: number;
  extractionRetryCount?: number;
  missingFieldsCount?: number;
  error?: string;
};

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    @InjectRepository(ExtractorEntity)
    private readonly extractorRepository: Repository<ExtractorEntity>,
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    @InjectRepository(PromptEntity)
    private readonly promptRepository: Repository<PromptEntity>,
    private readonly textExtractorService: TextExtractorService,
    private readonly llmService: LlmService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly promptsService: PromptsService,
    private readonly schemaRulesService: SchemaRulesService,
    private readonly schemasService: SchemasService,
    private readonly modelPricingService: ModelPricingService,
    private readonly configService: ConfigService,
    @Inject('IFileAccessService')
    private readonly fileSystem: IFileAccessService,
    private readonly manifestsService: ManifestsService,
  ) {}

  private formatStageLogLine(
    event: 'start' | 'end' | 'fail',
    stage: ExtractionStatus,
    extras: StageLogExtras,
  ): string {
    const parts: string[] = [`event=${event}`, `stage=${stage}`];
    const push = (key: string, value: string | number | null | undefined) => {
      if (value === undefined) return;
      if (value === null) {
        parts.push(`${key}=null`);
        return;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return;
        parts.push(/\s/.test(trimmed) ? `${key}=${JSON.stringify(trimmed)}` : `${key}=${trimmed}`);
        return;
      }
      parts.push(`${key}=${String(value)}`);
    };

    push('manifestId', extras.manifestId);
    push('jobId', extras.jobId);
    push('durationMs', extras.durationMs);
    push('extractionRetryCount', extras.extractionRetryCount);
    push('missingFieldsCount', extras.missingFieldsCount);
    push('error', extras.error);
    return parts.join(' ');
  }

  private async withStageBoundaryLogs<T>(
    stage: ExtractionStatus,
    base: StageLogExtras,
    run: () => Promise<T>,
    getExtras?: () => StageLogExtras,
  ): Promise<T> {
    const startedAt = Date.now();
    this.logger.log(this.formatStageLogLine('start', stage, { ...base, ...(getExtras?.() ?? {}) }));

    try {
      const result = await run();
      const durationMs = Date.now() - startedAt;
      this.logger.log(
        this.formatStageLogLine('end', stage, { ...base, durationMs, ...(getExtras?.() ?? {}) }),
      );
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const extras = getExtras?.() ?? {};
      const message = this.formatError(error);
      const line = this.formatStageLogLine('fail', stage, {
        ...base,
        durationMs,
        ...extras,
        error: message,
      });
      if (error instanceof Error) {
        this.logger.error(line, error.stack);
      } else {
        this.logger.error(line);
      }
      throw error;
    }
  }

  async optimizePrompt(description: string): Promise<{ prompt: string }> {
    const systemPrompt = [
      'You are an expert prompt designer for document data extraction.',
      'Create a concise, production-ready system prompt for an LLM to extract structured data from documents.',
      'Requirements to embed:',
      '- The prompt MUST be schema-driven and domain-neutral by default.',
      '- Only include domain-specific rules if they are explicitly provided in the description (or in the schema/rules/settings outside this optimizer).',
      '- Prefer null over guessing. Do not invent values.',
      '- Capture dates in ISO format (YYYY-MM-DD) when possible.',
      'Return only the prompt text without quotes or extra commentary.',
    ].join('\n');

    const userPrompt = ['Project description:', description.trim(), '', 'Generate the system prompt.'].join('\n');

    try {
      const candidateModels = await this.modelRepository.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
      const defaultLlmModel = candidateModels.find((model) => {
        const schema = adapterRegistry.getSchema(model.adapterType);
        return schema?.category === 'llm';
      });
      if (!defaultLlmModel) {
        throw new BadRequestException(
          'No active LLM model is configured. Create an LLM model first.',
        );
      }

      const providerConfig = this.buildLlmProviderConfig(defaultLlmModel);
      const result = await this.llmService.createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {}, providerConfig);

      return { prompt: result.content.trim() };
    } catch (error) {
      this.logger.error('Prompt optimization failed', error as Error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to optimize prompt');
    }
  }

  async runExtraction(
    manifestId: number,
    options: ExtractionOptions = {},
    onProgress?: (progress: number) => void,
  ): Promise<ExtractionWorkflowState> {
    const manifest = await this.manifestRepository.findOne({
      where: { id: manifestId },
      relations: ['group', 'group.project'],
    });

    if (!manifest) {
      throw new NotFoundException(`Manifest ${manifestId} not found`);
    }

    const previousExtractedData =
      manifest.extractedData &&
      typeof manifest.extractedData === 'object' &&
      !Array.isArray(manifest.extractedData)
        ? (manifest.extractedData as ExtractedData)
        : null;
    const targetFieldName = this.normalizeFieldPath(options.fieldName);
    const isFieldReExtract = Boolean(targetFieldName) && Boolean(previousExtractedData);

    const reportProgress = this.buildProgressReporter(onProgress);
    reportProgress(5);

    const project = manifest.group?.project ?? null;
    if (!project) {
      throw new BadRequestException('Project not found for manifest');
    }
    if (!project.llmModelId) {
      throw new BadRequestException('Project LLM model is required for extraction');
    }
    if (!project.defaultSchemaId) {
      throw new BadRequestException('Project schema is required for extraction');
    }
    if (!project.textExtractorId) {
      throw new BadRequestException('Project text extractor is required for extraction');
    }
    const textExtractorId = project.textExtractorId;

    const schema = this.schemasService.findOneInternal
      ? await this.schemasService.findOneInternal(project.defaultSchemaId)
      : await (this.schemasService as any).findOne(project.defaultSchemaId);
    const rules = await this.schemaRulesService.findBySchema(schema.id);
    const enabledRules = rules.filter((rule) => rule.enabled);

    const llmModelFromProject = project.llmModelId
      ? await this.modelRepository.findOne({ where: { id: project.llmModelId } })
      : null;
    if (project.llmModelId && !llmModelFromProject) {
      throw new NotFoundException(`LLM model ${project.llmModelId} not found`);
    }

    const llmModelFromId = options.llmModelId
      ? await this.modelRepository.findOne({ where: { id: options.llmModelId } })
      : null;
    if (options.llmModelId && !llmModelFromId) {
      throw new NotFoundException(`Model ${options.llmModelId} not found`);
    }

    const llmModel = options.llmModel ?? llmModelFromId ?? llmModelFromProject ?? undefined;
    if (!llmModel) {
      throw new BadRequestException('LLM model is required for extraction');
    }
    this.ensureModelCategory(llmModel, 'llm');

    const promptFromId = options.promptId
      ? await this.promptRepository.findOne({ where: { id: options.promptId } })
      : null;
    if (options.promptId && !promptFromId) {
      throw new NotFoundException(`Prompt ${options.promptId} not found`);
    }
    const systemPromptOverride = promptFromId?.content?.trim() || undefined;
    const reExtractPromptOverride = promptFromId?.content?.trim() || undefined;

    const state: ExtractionWorkflowState = {
      manifestId: manifest.id,
      status: ExtractionStatus.PENDING,
      errors: [],
      maxRetries: this.getNumberConfig('WORKFLOW_MAX_RETRIES', 3),
      extractionRetryCount: 0,
    };

    if (isFieldReExtract && previousExtractedData && targetFieldName) {
      state.extractionRetryCount = 1;
      state.extractionResult = {
        data: previousExtractedData,
        success: false,
        retryCount: 0,
        error: `Re-extract requested for ${targetFieldName}`,
        validation: {
          valid: false,
          missingFields: [targetFieldName],
          errors: [],
        },
      };
    }

    await this.updateManifestStatus(manifest, ManifestStatus.PROCESSING);

    try {
      const logBase: StageLogExtras = {
        manifestId: manifest.id,
        jobId: options.queueJobId,
      };

      await this.withStageBoundaryLogs(
        ExtractionStatus.VALIDATING,
        logBase,
        async () => {
          state.status = ExtractionStatus.VALIDATING;
          reportProgress(10);
          await this.validateManifest(manifest, state);
        },
        () => ({ extractionRetryCount: state.extractionRetryCount }),
      );

      await this.withStageBoundaryLogs(
        ExtractionStatus.TEXT_EXTRACTING,
        logBase,
        async () => {
          state.status = ExtractionStatus.TEXT_EXTRACTING;
          reportProgress(25);
          const textResult = manifest.ocrResult
            ? await this.buildCachedTextExtractionState(manifest, textExtractorId)
            : await this.executeTextExtraction(
                manifest,
                await this.fileSystem.readFile(manifest.storagePath),
                textExtractorId,
                async (update) => {
                  if (update.pagesTotal > 0) {
                    const range = 15;
                    const fraction = Math.min(1, Math.max(0, update.pagesProcessed / update.pagesTotal));
                    const progress = 25 + Math.floor(fraction * (range - 1));
                    reportProgress(progress);
                  }
                  await options.onTextProgress?.(update);
                },
              );
          state.textResult = textResult;
          reportProgress(40);
        },
        () => ({ extractionRetryCount: state.extractionRetryCount }),
      );

      await this.withStageBoundaryLogs(
        ExtractionStatus.EXTRACTING,
        logBase,
        async () => {
          await this.runExtractionLoop(
            state,
            {
              ...options,
              llmModel,
              systemPromptOverride,
              reExtractPromptOverride,
            },
            schema,
            enabledRules,
            isFieldReExtract && targetFieldName
              ? [targetFieldName]
              : schema?.requiredFields ?? [],
          );
          reportProgress(80);
        },
        () => {
          const missingFieldsCount = state.extractionResult?.validation?.missingFields?.length ?? 0;
          return {
            extractionRetryCount: state.extractionRetryCount,
            missingFieldsCount: missingFieldsCount > 0 ? missingFieldsCount : undefined,
          };
        },
      );

      await this.withStageBoundaryLogs(
        ExtractionStatus.SAVING,
        logBase,
        async () => {
          state.status = ExtractionStatus.SAVING;
          reportProgress(90);

          const costSummary = this.calculateCostSummary(state, llmModel);
          state.textCost = costSummary.textCost;
          state.llmCost = costSummary.llmCost;
          state.currency = costSummary.currency ?? undefined;
          state.extractionCost = costSummary.totalCost ?? undefined;

          manifest.textCost = costSummary.textCost;
          manifest.llmCost = costSummary.llmCost;
          manifest.extractionCost = costSummary.totalCost;
          manifest.extractionCostCurrency = costSummary.currency;

          if (
            isFieldReExtract &&
            previousExtractedData &&
            targetFieldName &&
            state.extractionResult?.success
          ) {
            state.extractionResult.data = this.mergeFieldReExtractResult(
              previousExtractedData,
              state.extractionResult.data,
              targetFieldName,
            );
          }

          await this.saveResult(manifest, state);
          state.status = ExtractionStatus.COMPLETED;
          reportProgress(100);
        },
        () => ({ extractionRetryCount: state.extractionRetryCount }),
      );

      return state;
    } catch (error) {
      const message = this.formatError(error);
      if (error instanceof Error) {
        this.logger.error(`Extraction workflow failed: ${message}`, error.stack);
      } else {
        this.logger.error(`Extraction workflow failed: ${message}`);
      }
      state.errors.push(message);
      state.currentError = message;
      state.status = ExtractionStatus.FAILED;
      await this.updateManifestStatus(manifest, ManifestStatus.FAILED);
      throw error;
    }
  }

  private async executeTextExtraction(
    manifest: ManifestEntity,
    buffer: Buffer,
    extractorId: string,
    onProgress?: (update: TextExtractionProgressUpdate) => void | Promise<void>,
  ): Promise<TextExtractionState> {
    const mimeType = this.getMimeTypeFromFilename(manifest.originalFilename);
    const { extractor, result } = await this.textExtractorService.extract(extractorId, {
      buffer,
      fileType: manifest.fileType,
      filePath: manifest.storagePath,
      originalFilename: manifest.originalFilename,
      mimeType,
      onProgress,
    });

    const ocrResult = result.metadata.ocrResult ?? null;
    const qualityScore = result.metadata.qualityScore ?? null;

    if (ocrResult) {
      manifest.ocrResult = ocrResult as unknown as Record<string, unknown>;
      manifest.ocrProcessedAt = new Date(ocrResult.metadata.processedAt ?? new Date().toISOString());
      manifest.ocrQualityScore = qualityScore ?? null;
    }
    manifest.textExtractorId = extractor.id;

    await this.manifestRepository.save(manifest);

    return {
      text: result.text,
      markdown: result.markdown,
      metadata: result.metadata,
      ocrResult: ocrResult ?? undefined,
    };
  }

  private async buildCachedTextExtractionState(
    manifest: ManifestEntity,
    fallbackExtractorId: string,
  ): Promise<TextExtractionState> {
    const ocrResult = (manifest.ocrResult ?? null) as unknown as OcrResultDto | null;
    if (!ocrResult) {
      throw new InternalServerErrorException('Cannot build cached text extraction state without OCR result');
    }

    const pages = Array.isArray(ocrResult.pages) ? ocrResult.pages : [];
    const text = pages.map((page) => page.text ?? '').join('\n').trim();
    const markdown = pages.map((page) => page.markdown ?? '').join('\n').trim();
    const pagesProcessed = pages.length > 0 ? pages.length : (ocrResult.document?.pages ?? 1);

    const extractorId = manifest.textExtractorId ?? fallbackExtractorId;
    const extractor = await this.extractorRepository.findOne({ where: { id: extractorId } });
    const pricing = (extractor?.config?.pricing as PricingConfig | undefined) ?? undefined;

    const tokensMax = this.estimateTokensFromOcr(ocrResult).max;
    const estimatedTextCost = this.calculateTextCostEstimate(pricing, pagesProcessed, tokensMax);

    const metadata: TextExtractionMetadata = {
      extractorId,
      processingTimeMs: 0,
      pagesProcessed,
      textCost: estimatedTextCost,
      currency: pricing?.currency ?? undefined,
      qualityScore: manifest.ocrQualityScore ?? undefined,
      estimated: true,
      ocrResult: ocrResult,
    };

    return {
      text,
      markdown,
      metadata,
      ocrResult,
    };
  }

  private estimateTokensFromOcr(ocrResult: OcrResultDto): { min: number; max: number } {
    const pages = Array.isArray(ocrResult.pages) ? ocrResult.pages : [];
    const textLength = pages.reduce((sum, page) => sum + (page?.text?.length ?? 0), 0);
    if (!textLength) {
      return { min: 0, max: 0 };
    }
    const estimatedTokens = Math.ceil(textLength / 4);
    const min = Math.max(1, Math.floor(estimatedTokens * 0.8));
    const max = Math.max(min, Math.ceil(estimatedTokens * 1.2));
    return { min, max };
  }

  private estimateTokenUsage(
    messages: LlmChatMessage[],
    assistantContent: string,
  ): { promptTokens: number; completionTokens: number; totalTokens: number } {
    const promptText = messages
      .map((message) => this.normalizeChatContent(message.content))
      .filter((content): content is string => typeof content === 'string' && content.trim().length > 0)
      .join('\n');

    const estimateTokens = (text: string): number => {
      const length = text.trim().length;
      if (!length) return 0;
      return Math.max(1, Math.ceil(length / 4));
    };

    const promptTokens = estimateTokens(promptText);
    const completionTokens = estimateTokens(assistantContent);
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  private calculateTextCostEstimate(
    pricing: PricingConfig | undefined,
    pagesTotal: number,
    tokensMax: number,
  ): number {
    if (!pricing || pricing.mode === 'none') {
      return 0;
    }

    if (pricing.mode === 'page') {
      const pagesNano = numberToNano(Math.max(0, pagesTotal));
      const priceNano = numberToNano(pricing.pricePerPage ?? 0);
      const rawCostNano = multiplyNanoAmounts(pagesNano, priceNano);
      const costNano = applyMinimumCharge(
        rawCostNano,
        numberToNano(pricing.minimumCharge),
      );
      return nanoToNumber(costNano);
    }

    if (pricing.mode === 'fixed') {
      const rawCostNano = numberToNano(pricing.fixedCost ?? 0);
      const costNano = applyMinimumCharge(
        rawCostNano,
        numberToNano(pricing.minimumCharge),
      );
      return nanoToNumber(costNano);
    }

    if (pricing.mode === 'token') {
      const inputPrice = pricing.inputPricePerMillionTokens ?? 0;
      const outputPrice = pricing.outputPricePerMillionTokens ?? 0;
      const rawCostNano = calculateTokenCostNano(
        tokensMax,
        Math.round(tokensMax * 0.2),
        inputPrice,
        outputPrice,
      );
      const costNano = applyMinimumCharge(
        rawCostNano,
        numberToNano(pricing.minimumCharge),
      );
      return nanoToNumber(costNano);
    }

    return 0;
  }

  private async runExtractionLoop(
    state: ExtractionWorkflowState,
    options: ExtractionOptions & { llmModel: ModelEntity },
    schema: SchemaEntity | null,
    rules: SchemaRuleEntity[] | null,
    requiredFields: string[],
  ): Promise<void> {
    const providerConfig = this.buildLlmProviderConfig(options.llmModel);
    const systemPrompt = this.getSystemPrompt(schema, options.systemPromptOverride);
    const reExtractSystemPrompt = this.getReExtractPrompt(schema, options.reExtractPromptOverride);
    const activeRules = (rules ?? []).filter((rule) => rule.enabled !== false);
    const contextOverride = options.textContextSnippet?.trim() || undefined;
    const customPrompt = options.customPrompt?.trim() || undefined;
    const queueJobId = options.queueJobId;

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
        activeRules,
        contextOverride,
        customPrompt,
        queueJobId,
      );
      state.extractionResult = extractionResult;

      if (extractionResult.success) {
        return;
      }

      if (this.canRetryExtraction(state)) {
        await this.delayWithBackoff(state.extractionRetryCount);
      } else {
        const error = extractionResult.error ?? 'Extraction failed after retries';
        throw new InternalServerErrorException(error);
      }
    }
  }

  private async executeExtraction(
    state: ExtractionWorkflowState,
    providerConfig: LlmProviderConfig | undefined,
    systemPrompt: string,
    reExtractSystemPrompt: string,
    requiredFields: string[],
    schema: SchemaEntity | null,
    rules: SchemaRuleEntity[],
    contextOverride?: string,
    customPrompt?: string,
    queueJobId?: string,
  ): Promise<ExtractionStateResult> {
    const previousExtraction = state.extractionResult;
    const useReExtract = state.extractionRetryCount > 0 && Boolean(previousExtraction);

    const messages = this.buildTextMessages(
      state,
      systemPrompt,
      reExtractSystemPrompt,
      useReExtract,
      previousExtraction,
      requiredFields,
      schema,
      rules,
      contextOverride,
      customPrompt,
    );

    await this.persistPromptSnapshot(queueJobId, messages);

    const llmOptions: { responseFormat?: LlmResponseFormat; useStream?: boolean } = {
      useStream: providerConfig?.type?.toLowerCase() === 'openai' || !providerConfig?.type ? true : undefined,
    };
    if (schema && providerConfig) {
      const supportsStructuredOutput =
        providerConfig.supportsStructuredOutput ??
        this.llmService.providerSupportsStructuredOutput(
          providerConfig.type,
          providerConfig.modelName ?? undefined,
        );
      if (supportsStructuredOutput) {
        llmOptions.responseFormat = {
          type: 'json_schema',
          json_schema: {
            name: 'extracted_data',
            description: 'Extracted data from the document',
            strict: false,
            schema: schema.jsonSchema as Record<string, unknown>,
          },
        };
      }
    }

    try {
      const completion = await this.llmService.createChatCompletion(messages, llmOptions, providerConfig);
      await this.persistAssistantResponse(queueJobId, completion.content);
      const data = this.parseJsonResult(completion.content);
      let tokenUsage = this.normalizeTokenUsage(completion.usage);
      if (!tokenUsage || tokenUsage.totalTokens <= 0) {
        tokenUsage = this.estimateTokenUsage(messages, completion.content);
      }

      let validation: ExtractionValidationResult;
      if (schema) {
        const ajvResult = this.schemasService.validateWithRequiredFields({
          jsonSchema: schema.jsonSchema as Record<string, unknown>,
          data,
        });
        validation = {
          valid: ajvResult.valid,
          missingFields: ajvResult.missingFields ?? [],
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
          tokenUsage,
        };
      }

      return {
        data,
        success: true,
        retryCount: state.extractionRetryCount,
        validation,
        tokenUsage,
      };
    } catch (error) {
      if (this.isContextLengthExceeded(error)) {
        throw new OcrContextTooLargeError();
      }
      return {
        data: {},
        success: false,
        error: this.formatError(error),
        retryCount: state.extractionRetryCount,
      };
    }
  }

  private async persistPromptSnapshot(queueJobId: string | undefined, messages: LlmChatMessage[]): Promise<void> {
    if (!queueJobId) {
      return;
    }
    const system = this.normalizeChatContent(messages.find((m) => m.role === 'system')?.content ?? null);
    const user = this.normalizeChatContent(messages.find((m) => m.role === 'user')?.content ?? null);
    try {
      await this.manifestsService.updateJobPromptSnapshot(queueJobId, system, user);
    } catch {
      // Best-effort: must not break extraction.
    }
  }

  private async persistAssistantResponse(queueJobId: string | undefined, content: string): Promise<void> {
    if (!queueJobId) {
      return;
    }
    try {
      await this.manifestsService.updateJobAssistantResponse(queueJobId, content);
    } catch {
      // Best-effort.
    }
  }

  private normalizeChatContent(content: LlmChatMessage['content'] | null): string | null {
    if (content === null) {
      return null;
    }
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map((part) => (part.type === 'text' ? part.text : `[image] ${part.image_url.url}`))
        .join('\n');
    }
    if (content.type === 'text') {
      return content.text;
    }
    return `[image] ${content.image_url.url}`;
  }

  private buildTextMessages(
    state: ExtractionWorkflowState,
    systemPrompt: string,
    reExtractSystemPrompt: string,
    useReExtract: boolean,
    previousExtraction?: ExtractionStateResult,
    requiredFields: string[] = [],
    schema?: SchemaEntity | null,
    rules: SchemaRuleEntity[] = [],
    contextOverride?: string,
    customPrompt?: string,
  ): LlmChatMessage[] {
    if (!schema) {
      throw new BadRequestException('Schema is required for extraction');
    }

    const textMarkdown = contextOverride ?? state.textResult?.markdown ?? '';
    const promptParts =
      useReExtract && previousExtraction
        ? this.promptBuilderService.buildReExtractPrompt(
            textMarkdown,
            previousExtraction.data,
            previousExtraction.validation?.missingFields,
            previousExtraction.error,
            schema,
            rules,
            requiredFields,
          )
        : this.promptBuilderService.buildExtractionPrompt(textMarkdown, schema, rules, requiredFields);

    let nextSystemPrompt = useReExtract ? reExtractSystemPrompt : systemPrompt;
    if (promptParts.systemContext) {
      nextSystemPrompt = `${nextSystemPrompt}\n\n${promptParts.systemContext}`;
    }
    if (customPrompt) {
      nextSystemPrompt = `${nextSystemPrompt}\n\nAdditional instructions:\n${customPrompt}`;
    }

    return [
      {
        role: 'system',
        content: nextSystemPrompt,
      },
      {
        role: 'user',
        content: promptParts.userInput,
      },
    ];
  }

  private async validateManifest(
    manifest: ManifestEntity,
    state: ExtractionWorkflowState,
  ): Promise<void> {
    const filePath = manifest.storagePath;
    const fileExt = path.extname(manifest.originalFilename).toLowerCase();

    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    if (!validExtensions.includes(fileExt)) {
      this.raiseError(
        state,
        `Manifest file type not supported: ${manifest.originalFilename}. Supported types: PDF, PNG, JPEG, GIF, WebP, BMP`,
      );
    }

    try {
      const stats = await this.fileSystem.getFileStats(filePath);
      if (!stats.isFile) {
        this.raiseError(state, `Manifest file path is not a file: ${filePath}`);
      }
      if (stats.size === 0) {
        this.raiseError(state, `Manifest file is empty: ${filePath}`);
      }
    } catch (error) {
      this.raiseError(state, `Manifest file not accessible: ${this.formatError(error)}`);
    }
  }

  private calculateCostSummary(
    state: ExtractionWorkflowState,
    llmModel?: ModelEntity,
  ): { textCost: number; llmCost: number; totalCost: number | null; currency: string | null } {
    const textMetadata = state.textResult?.metadata;
    const textCost = textMetadata?.estimated ? 0 : (textMetadata?.textCost ?? 0);
    const tokenUsage = state.extractionResult?.tokenUsage;
    const llmCost = llmModel && tokenUsage
      ? this.modelPricingService.calculateLlmCost(
          tokenUsage.promptTokens,
          tokenUsage.completionTokens,
          llmModel.pricing,
        )
      : 0;

    const textCurrencyRaw = textMetadata?.currency ?? null;
    const llmCurrencyRaw = llmModel
      ? (this.modelPricingService.getCurrency(llmModel.pricing) ?? null)
      : null;

    const hasText = textCost > 0;
    const hasLlm = llmCost > 0;

    const knownCurrencies = new Set<string>();
    const addKnownCurrency = (raw: string | null) => {
      const trimmed = raw?.trim() || '';
      if (trimmed) {
        knownCurrencies.add(trimmed);
      }
    };

    if (hasText) {
      addKnownCurrency(textCurrencyRaw);
    }
    if (hasLlm) {
      addKnownCurrency(llmCurrencyRaw);
    }

    const currency =
      knownCurrencies.size === 1
        ? Array.from(knownCurrencies)[0]
        : knownCurrencies.size > 1
          ? null
          : hasText || hasLlm
            ? 'unknown'
            : null;

    const totalCost = !hasText && !hasLlm ? 0 : currency === null ? null : textCost + llmCost;

    return { textCost, llmCost, totalCost, currency };
  }

  private async saveResult(manifest: ManifestEntity, state: ExtractionWorkflowState): Promise<void> {
    const extraction = state.extractionResult;
    if (!extraction || !extraction.success) {
      throw new InternalServerErrorException('Cannot save: extraction failed');
    }

    manifest.extractedData = extraction.data;
    const confidence =
      (extraction.data._extraction_info as Record<string, unknown> | undefined)?.confidence as
        | number
        | undefined;
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

  private buildLlmProviderConfig(llmModel?: ModelEntity): LlmProviderConfig | undefined {
    if (!llmModel) {
      return undefined;
    }

    const parameters = llmModel.parameters ?? {};
    return {
      type: llmModel.adapterType,
      baseUrl: this.getStringParam(parameters, 'baseUrl'),
      apiKey: this.getStringParam(parameters, 'apiKey'),
      modelName: this.getStringParam(parameters, 'modelName'),
      temperature: this.getNumberParam(parameters, 'temperature'),
      maxTokens: this.getNumberParam(parameters, 'maxTokens'),
      supportsVision: this.getBooleanParam(parameters, 'supportsVision'),
      supportsStructuredOutput: this.getBooleanParam(parameters, 'supportsStructuredOutput'),
    };
  }

  private ensureModelCategory(model: ModelEntity, expectedCategory: 'ocr' | 'llm'): void {
    const schema = adapterRegistry.getSchema(model.adapterType);
    if (!schema) {
      throw new BadRequestException(`Model ${model.id} has unknown adapter type`);
    }
    if (schema.category !== expectedCategory) {
      throw new BadRequestException(`Model ${model.id} is not a valid ${expectedCategory} model`);
    }
  }

  private getStringParam(parameters: Record<string, unknown>, key: string): string | undefined {
    const value = parameters[key];
    return typeof value === 'string' ? value : undefined;
  }

  private getNumberParam(parameters: Record<string, unknown>, key: string): number | undefined {
    const value = parameters[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private getBooleanParam(parameters: Record<string, unknown>, key: string): boolean | undefined {
    const value = parameters[key];
    return typeof value === 'boolean' ? value : undefined;
  }

  private normalizeFieldPath(fieldName: string | undefined): string | undefined {
    const trimmed = fieldName?.trim();
    if (!trimmed) return undefined;
    return trimmed.endsWith('?') ? trimmed.slice(0, -1) : trimmed;
  }

  private normalizeTokenUsage(usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  }): { promptTokens: number; completionTokens: number; totalTokens: number } | undefined {
    if (!usage) {
      return undefined;
    }
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
    return { promptTokens, completionTokens, totalTokens };
  }

  private mergeFieldReExtractResult(base: ExtractedData, patch: ExtractedData, fieldPath: string): ExtractedData {
    const merged = this.cloneJson(base);
    const value = this.getPathValue(patch, fieldPath);
    this.setPathValue(merged, fieldPath, value);

    const extractionInfo = this.getPathValue(patch, '_extraction_info');
    if (extractionInfo !== undefined) {
      this.setPathValue(merged, '_extraction_info', extractionInfo);
    }

    return merged;
  }

  private cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private getPathValue(obj: unknown, fieldPath: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = fieldPath.split('.').filter(Boolean);
    let current: any = obj;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      current = current[part];
    }
    return current;
  }

  private setPathValue(obj: unknown, fieldPath: string, value: unknown): void {
    if (!obj || typeof obj !== 'object') return;
    const parts = fieldPath.split('.').filter(Boolean);
    if (parts.length === 0) return;

    let current: any = obj;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (current[key] == null || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[parts[parts.length - 1]] = value;
  }

  private getSystemPrompt(schema: SchemaEntity | null, override?: string): string {
    const base = (() => {
      if (override) return override;
      if (schema?.systemPromptTemplate) return schema.systemPromptTemplate;
      return this.promptsService.getSystemPrompt();
    })();

    const promptRulesMarkdown = this.getPromptRulesMarkdown(schema);
    if (!promptRulesMarkdown) {
      return base;
    }

    return `${base}\n\nPrompt Rules (Markdown):\n${promptRulesMarkdown}`;
  }

  private getReExtractPrompt(schema: SchemaEntity | null, override?: string): string {
    const base = (() => {
      if (override) return override;
      if (schema?.systemPromptTemplate) return schema.systemPromptTemplate;
      return this.promptsService.getReExtractSystemPrompt();
    })();

    const promptRulesMarkdown = this.getPromptRulesMarkdown(schema);
    if (!promptRulesMarkdown) {
      return base;
    }

    return `${base}\n\nPrompt Rules (Markdown):\n${promptRulesMarkdown}`;
  }

  private getPromptRulesMarkdown(schema: SchemaEntity | null): string | undefined {
    const raw = schema?.validationSettings as Record<string, unknown> | null | undefined;
    const value = raw?.promptRulesMarkdown;
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private validateResult(data: Record<string, unknown>, requiredFields: string[]): ExtractionValidationResult {
    const result: ExtractionValidationResult = {
      valid: true,
      missingFields: [],
      errors: [],
    };

    for (const fieldPath of requiredFields) {
      const nullable = fieldPath.endsWith('?');
      const actualPath = nullable ? fieldPath.slice(0, -1) : fieldPath;
      const { exists, value } = this.checkFieldExistsWithValue(data, actualPath);

      if (nullable) {
        if (!exists) {
          result.valid = false;
          result.missingFields.push(actualPath);
          result.errors.push(`Missing nullable field: ${actualPath}`);
        }
      } else if (!exists) {
        result.valid = false;
        result.missingFields.push(actualPath);
        result.errors.push(`Missing required field: ${actualPath}`);
      } else if (value === undefined) {
        result.valid = false;
        result.missingFields.push(actualPath);
        result.errors.push(`Required field empty: ${actualPath}`);
      }
    }

    return result;
  }

  private checkFieldExistsWithValue(
    data: Record<string, unknown>,
    fieldPath: string,
  ): { exists: boolean; value?: unknown } {
    const parts = fieldPath.split('.').filter(Boolean);

    const checkPath = (current: unknown, index: number): { exists: boolean; value?: unknown } => {
      if (index >= parts.length) {
        return { exists: true, value: current };
      }
      if (current === null || typeof current !== 'object') {
        return { exists: false };
      }

      const part = parts[index];
      const anyMatch = part.match(/(.+)\[\]$/);
      if (anyMatch) {
        const key = anyMatch[1];
        const obj = current as Record<string, unknown>;
        const value = obj[key];
        if (!Array.isArray(value) || value.length === 0) {
          return { exists: false };
        }
        if (index === parts.length - 1) {
          return { exists: true, value };
        }
        for (const item of value) {
          const result = checkPath(item, index + 1);
          if (result.exists) {
            return result;
          }
        }
        return { exists: false };
      }

      const arrayMatch = part.match(/(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const key = arrayMatch[1];
        const arrayIndex = Number.parseInt(arrayMatch[2], 10);
        const obj = current as Record<string, unknown>;
        const value = obj[key];
        if (!Array.isArray(value) || arrayIndex >= value.length) {
          return { exists: false };
        }
        return checkPath(value[arrayIndex], index + 1);
      }

      const obj = current as Record<string, unknown>;
      if (!(part in obj)) {
        return { exists: false };
      }

      return checkPath(obj[part], index + 1);
    };

    const result = checkPath(data, 0);
    if (!result.exists) {
      return result;
    }

    if (result.value === null) {
      return { exists: true, value: null };
    }

    if (typeof result.value === 'string' && !result.value.trim()) {
      return { exists: false };
    }

    return result;
  }

  private parseJsonResult(content: string): Record<string, unknown> {
    const sanitized = this.stripJsonCodeFence(content);
    const parsed = JSON.parse(sanitized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new InternalServerErrorException('Invalid extraction result: not an object');
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

  private canRetryExtraction(state: ExtractionWorkflowState): boolean {
    if (!this.getBooleanConfig('WORKFLOW_ENABLE_EXTRACTION_RETRY', true)) {
      return false;
    }

    state.extractionRetryCount += 1;
    return state.extractionRetryCount <= state.maxRetries;
  }

  private async delayWithBackoff(retryCount: number): Promise<void> {
    const baseDelaySeconds = this.getNumberConfig('WORKFLOW_RETRY_DELAY_BASE', 2);
    const delayMs = baseDelaySeconds * 1000 * 2 ** (retryCount - 1);
    this.logger.warn(`Retrying in ${delayMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  private raiseError(state: ExtractionWorkflowState, message: string): never {
    state.errors.push(message);
    state.currentError = message;
    throw new BadRequestException(message);
  }

  private getBooleanConfig(key: string, defaultValue: boolean): boolean {
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
    const value = typeof raw === 'number' ? raw : Number.parseFloat(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private buildProgressReporter(onProgress?: (progress: number) => void): (progress: number) => void {
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


  private isContextLengthExceeded(error: unknown): boolean {
    const parts: string[] = [];

    const push = (value: unknown) => {
      if (value === undefined || value === null) {
        return;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          parts.push(trimmed.length > 2000 ? `${trimmed.slice(0, 2000)}...` : trimmed);
        }
        return;
      }
      if (value instanceof Error) {
        push(value.message);
        return;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        parts.push(String(value));
        return;
      }
      if (typeof value === 'object') {
        try {
          const serialized = JSON.stringify(value);
          if (serialized) {
            parts.push(serialized.length > 2000 ? `${serialized.slice(0, 2000)}...` : serialized);
          }
        } catch {
          // Ignore unserializable values.
        }
      }
    };

    push(error);
    if (typeof error === 'object' && error) {
      const anyError = error as any;
      push(anyError.code);
      push(anyError.type);
      push(anyError.status);
      push(anyError.response?.data);
      push(anyError.response?.message);
      push(anyError.cause);
      if (typeof anyError.getResponse === 'function') {
        try {
          push(anyError.getResponse());
        } catch {
          // Ignore.
        }
      }
    }

    const haystack = parts.join(' | ').toLowerCase();
    return (
      haystack.includes('context_length_exceeded') ||
      haystack.includes('maximum context length') ||
      haystack.includes('too many tokens') ||
      haystack.includes('context length') ||
      haystack.includes('prompt is too long')
    );
  }
  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error ?? 'Unknown error');
  }

  private getMimeTypeFromFilename(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'image/png';
  }
}
