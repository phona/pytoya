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
import { LlmResponseFormat } from '../llm/llm.types';
import { LlmService } from '../llm/llm.service';
import { LlmChatMessage, LlmProviderConfig } from '../llm/llm.types';
import { OcrService } from '../ocr/ocr.service';
import { OcrResponse } from '../ocr/types/ocr.types';
import { buildCachedOcrResult, calculateOcrQualityScore } from '../ocr/ocr-cache.util';
import { PdfToImageService, ConvertedPage } from '../pdf-to-image/pdf-to-image.service';
import { PromptBuilderService } from '../prompts/prompt-builder.service';
import { PromptsService } from '../prompts/prompts.service';
import { SchemaRulesService } from '../schemas/schema-rules.service';
import { SchemasService } from '../schemas/schemas.service';
import { IFileAccessService } from '../file-access/file-access.service';
import { ExtractedData } from '../prompts/types/prompts.types';
import { adapterRegistry } from '../models/adapters/adapter-registry';
import { ModelPricingService } from '../models/model-pricing.service';
import { OcrResultDto } from '../manifests/dto/ocr-result.dto';
import {
  ExtractionStateResult,
  ExtractionStatus,
  ExtractionValidationResult,
  ExtractionWorkflowState,
  OcrState,
  ExtractionStrategy,
} from './extraction.types';

type ExtractionOptions = {
  ocrModel?: ModelEntity;
  llmModel?: ModelEntity;
  ocrModelId?: string;
  llmModelId?: string;
  promptId?: number;
  systemPromptOverride?: string;
  reExtractPromptOverride?: string;
  fieldName?: string;
  customPrompt?: string;
  ocrContextSnippet?: string;
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
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    @InjectRepository(PromptEntity)
    private readonly promptRepository: Repository<PromptEntity>,
    private readonly ocrService: OcrService,
    private readonly llmService: LlmService,
    private readonly pdfToImageService: PdfToImageService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly promptsService: PromptsService,
    private readonly schemaRulesService: SchemaRulesService,
    private readonly schemasService: SchemasService,
    private readonly modelPricingService: ModelPricingService,
    private readonly configService: ConfigService,
    @Inject('IFileAccessService')
    private readonly fileSystem: IFileAccessService,
  ) {}

  /**
   * Determine the extraction strategy based on schema, file type, and model capabilities.
   */
  private determineExtractionStrategy(
    schema: SchemaEntity | null,
    fileType: FileType,
    llmModel?: ModelEntity,
    ocrModel?: ModelEntity,
  ): ExtractionStrategy {
    const supportsVision = llmModel ? this.getLlmSupportsVision(llmModel) : false;

    if (schema?.extractionStrategy) {
      let strategy = schema.extractionStrategy;
      if (strategy !== ExtractionStrategy.OCR_FIRST && !supportsVision) {
        this.logger.warn(
          `Schema specifies ${schema.extractionStrategy} but model doesn't support vision, falling back to OCR_FIRST`,
        );
        strategy = ExtractionStrategy.OCR_FIRST;
      }

      if (strategy !== ExtractionStrategy.VISION_ONLY && !ocrModel) {
        if (supportsVision) {
          return ExtractionStrategy.VISION_ONLY;
        }
        throw new BadRequestException('OCR model is required for non-vision extraction');
      }

      return strategy;
    }

    if (fileType === FileType.IMAGE && supportsVision) {
      return ExtractionStrategy.VISION_ONLY;
    }

    const fallback = ExtractionStrategy.OCR_FIRST;
    if (!ocrModel) {
      if (supportsVision) {
        return ExtractionStrategy.VISION_ONLY;
      }
      throw new BadRequestException('OCR model is required for non-vision extraction');
    }

    return fallback;
  }

  /**
   * Check if the extraction strategy requires PDF-to-image conversion.
   */
  private requiresPdfToImageConversion(
    strategy: ExtractionStrategy,
    fileType: FileType,
  ): boolean {
    return (
      fileType === FileType.PDF &&
      (strategy === ExtractionStrategy.VISION_FIRST ||
        strategy === ExtractionStrategy.VISION_ONLY ||
        strategy === ExtractionStrategy.TWO_STAGE)
    );
  }

  /**
   * Convert PDF to images for vision-based extraction.
   */
  private async convertPdfToImages(
    filePath: string,
  ): Promise<ConvertedPage[]> {
    this.logger.log(`Converting PDF to images: ${filePath}`);
    return await this.pdfToImageService.convertPdfToImages(filePath);
  }

  async optimizePrompt(description: string): Promise<{ prompt: string }> {
    const systemPrompt = [
      'You are an expert prompt designer for invoice extraction.',
      'Create a concise, production-ready system prompt for an LLM to extract structured data from Chinese invoices.',
      'Requirements to embed:',
      '- Purchase order numbers are 7 digits, zero-padded (e.g., "0000009").',
      '- Units must be one of KG, EA, or M.',
      '- Preserve Chinese text accurately; do not translate unless asked.',
      '- Capture dates in ISO format (YYYY-MM-DD) when possible.',
      '- Include a brief validation checklist for required fields.',
      'Return only the prompt text without quotes or extra commentary.',
    ].join('\n');

    const userPrompt = [
      'Project description:',
      description.trim(),
      '',
      'Generate the system prompt.',
    ].join('\n');

    try {
      const result = await this.llmService.createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      return { prompt: result.content.trim() };
    } catch (error) {
      this.logger.error('Prompt optimization failed', error as Error);
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
      relations: [
        'group',
        'group.project',
      ],
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
    const isFieldReExtract =
      Boolean(targetFieldName) && Boolean(previousExtractedData);

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

    // Load schema from project
    const schema = await this.schemasService.findOne(project.defaultSchemaId);
    const rules = await this.schemaRulesService.findBySchema(schema.id);
    const enabledRules = rules.filter((rule) => rule.enabled);

    const ocrModelFromProject = project?.ocrModelId
      ? await this.modelRepository.findOne({
          where: { id: project.ocrModelId },
        })
      : null;
    if (project?.ocrModelId && !ocrModelFromProject) {
      throw new NotFoundException(
        `OCR model ${project.ocrModelId} not found`,
      );
    }

    const llmModelFromProject = project?.llmModelId
      ? await this.modelRepository.findOne({
          where: { id: project.llmModelId },
        })
      : null;
    if (project?.llmModelId && !llmModelFromProject) {
      throw new NotFoundException(
        `LLM model ${project.llmModelId} not found`,
      );
    }

    const ocrModelFromId = options.ocrModelId
      ? await this.modelRepository.findOne({
          where: { id: options.ocrModelId },
        })
      : null;
    if (options.ocrModelId && !ocrModelFromId) {
      throw new NotFoundException(
        `Model ${options.ocrModelId} not found`,
      );
    }

    const llmModelFromId = options.llmModelId
      ? await this.modelRepository.findOne({
          where: { id: options.llmModelId },
        })
      : null;
    if (options.llmModelId && !llmModelFromId) {
      throw new NotFoundException(
        `Model ${options.llmModelId} not found`,
      );
    }

    const ocrModel =
      options.ocrModel ??
      ocrModelFromId ??
      ocrModelFromProject ??
      undefined;
    const llmModel =
      options.llmModel ??
      llmModelFromId ??
      llmModelFromProject ??
      undefined;
    if (!llmModel) {
      throw new BadRequestException('LLM model is required for extraction');
    }

    if (ocrModel) {
      this.ensureModelCategory(ocrModel, 'ocr');
    }
    if (llmModel) {
      this.ensureModelCategory(llmModel, 'llm');
    }

    const promptFromId = options.promptId
      ? await this.promptRepository.findOne({
          where: { id: options.promptId },
        })
      : null;
    if (options.promptId && !promptFromId) {
      throw new NotFoundException(
        `Prompt ${options.promptId} not found`,
      );
    }
    const systemPromptOverride = promptFromId?.content?.trim() || undefined;
    const reExtractPromptOverride = promptFromId?.content?.trim() || undefined;

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
      strategy: this.determineExtractionStrategy(schema, manifest.fileType, llmModel, ocrModel),
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
      state.status = ExtractionStatus.VALIDATING;
      reportProgress(10);
      await this.validateManifest(manifest, state);

      const fileBuffer = await this.fileSystem.readFile(manifest.storagePath);

      // Handle different extraction strategies
      if (this.requiresPdfToImageConversion(state.strategy, manifest.fileType)) {
        // Convert PDF to images for vision-based strategies
        state.convertedPages = await this.convertPdfToImages(manifest.storagePath);
        this.logger.log(
          `Converted ${state.convertedPages.length} pages for ${state.strategy} extraction`,
        );
        reportProgress(25);
      } else if (manifest.fileType === FileType.IMAGE && state.strategy === ExtractionStrategy.VISION_ONLY) {
        // For image files with VISION_ONLY, create a converted page from the image buffer
        const mimeType = this.getMimeTypeFromFilename(manifest.originalFilename);
        state.convertedPages = [
          {
            pageNumber: 1,
            buffer: fileBuffer,
            mimeType,
          },
        ];
        this.logger.log(`Using image file directly for ${state.strategy} extraction`);
        reportProgress(25);
      }

      // Run OCR for OCR_FIRST, VISION_FIRST, and TWO_STAGE strategies
      if (
        state.strategy === ExtractionStrategy.OCR_FIRST ||
        state.strategy === ExtractionStrategy.VISION_FIRST ||
        state.strategy === ExtractionStrategy.TWO_STAGE
      ) {
        const cachedOcr = this.buildOcrStateFromCache(manifest);
        if (cachedOcr) {
          state.ocrResult = cachedOcr;
          reportProgress(40);
        } else {
          state.ocrResult = await this.executeOcr(fileBuffer, state, ocrModel);
          reportProgress(40);
          await this.retryOcrIfNeeded(fileBuffer, state, ocrModel);
          if (state.ocrResult?.success && state.ocrResult.cachedResult) {
            await this.persistOcrResult(manifest, state.ocrResult.cachedResult);
          }
        }
      } else if (manifest.fileType === FileType.IMAGE) {
        // For images with VISION_ONLY, we don't need OCR
        this.logger.log('Skipping OCR for image file with VISION_ONLY strategy');
      }

      await this.runExtractionLoop(
        manifest,
        fileBuffer,
        state,
        {
          ...options,
          ocrModel,
          llmModel,
          systemPromptOverride,
          reExtractPromptOverride,
        },
        schema,
        enabledRules,
        isFieldReExtract && targetFieldName
          ? [targetFieldName]
          : schema?.requiredFields ?? this.getRequiredFields(),
      );
      reportProgress(80);

      state.status = ExtractionStatus.SAVING;
      reportProgress(90);

      const costSummary = this.calculateCostSummary(
        state,
        ocrModel,
        llmModel,
      );
      const totalCost = costSummary.ocrCost + costSummary.llmCost;
      state.ocrCost = costSummary.ocrCost;
      state.llmCost = costSummary.llmCost;
      state.extractionCost = totalCost;
      manifest.extractionCost = totalCost;

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
    rules: SchemaRuleEntity[] | null,
    requiredFields: string[],
  ): Promise<void> {
    const providerConfig = this.buildLlmProviderConfig(options.llmModel);
    const systemPrompt = this.getSystemPrompt(schema, options.systemPromptOverride);
    const reExtractSystemPrompt = this.getReExtractPrompt(schema, options.reExtractPromptOverride);
    const activeRules = (rules ?? []).filter((rule) => rule.enabled !== false);
    const contextOverride = options.ocrContextSnippet?.trim() || undefined;
    const customPrompt = options.customPrompt?.trim() || undefined;

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
        state.ocrResult = await this.executeOcr(fileBuffer, state, options.ocrModel);
        await this.retryOcrIfNeeded(fileBuffer, state, options.ocrModel);
        if (state.ocrResult?.success && state.ocrResult.cachedResult) {
          await this.persistOcrResult(manifest, state.ocrResult.cachedResult);
        }
      } else if (this.canRetryExtraction(state)) {
        await this.delayWithBackoff(state.extractionRetryCount);
      } else {
        const error =
          extractionResult.error ??
          'Extraction failed after retries';
        throw new InternalServerErrorException(error);
      }
    }
  }

  private async validateManifest(
    manifest: ManifestEntity,
    state: ExtractionWorkflowState,
  ): Promise<void> {
    const filePath = manifest.storagePath;
    const fileExt = path.extname(manifest.originalFilename).toLowerCase();

    // Accept both PDF and image files
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
    ocrModel?: ModelEntity,
  ): Promise<OcrState> {
    this.logger.log(
      `Starting OCR (attempt ${state.ocrRetryCount + 1})`,
    );
    state.status =
      state.ocrRetryCount > 0
        ? ExtractionStatus.OCR_RETRY
        : ExtractionStatus.OCR_PROCESSING;

    try {
      const { response, processingTimeMs } = await this.runOcrRequest(
        fileBuffer,
        ocrModel,
      );
      const cachedResult = buildCachedOcrResult(
        response,
        processingTimeMs,
        ocrModel,
      );

      return {
        rawText: response.raw_text,
        markdown: response.markdown,
        layout: response.layout,
        success: true,
        retryCount: state.ocrRetryCount,
        rawResponse: response,
        cachedResult,
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

  private async runOcrRequest(
    fileBuffer: Buffer,
    ocrModel?: ModelEntity,
  ): Promise<{ response: OcrResponse; processingTimeMs: number }> {
    const overrides = this.buildOcrOverrides(ocrModel);
    const start = Date.now();
    const response = await this.ocrService.processPdf(
      fileBuffer,
      overrides,
    );
    const processingTimeMs = Date.now() - start;
    return { response, processingTimeMs };
  }

  private buildOcrStateFromCache(
    manifest: ManifestEntity,
  ): OcrState | null {
    if (!manifest.ocrResult) {
      return null;
    }
    const cached = manifest.ocrResult as unknown as OcrResultDto;
    if (!cached || !Array.isArray(cached.pages)) {
      return null;
    }

    const rawText = cached.pages.map((page) => page.text).join('\n');
    const markdown = cached.pages.map((page) => page.markdown).join('\n');
    const numBlocks = cached.pages.reduce(
      (sum, page) => sum + (page.layout?.elements?.length ?? 0),
      0,
    );

    return {
      rawText,
      markdown,
      layout: {
        num_pages: cached.pages.length,
        num_blocks: numBlocks,
        blocks: [],
      },
      success: true,
      retryCount: 0,
      cachedResult: cached,
    };
  }

  private async persistOcrResult(
    manifest: ManifestEntity,
    cachedResult: OcrResultDto,
  ): Promise<void> {
    const processedAt =
      cachedResult.metadata?.processedAt ??
      new Date().toISOString();
    const qualityScore = calculateOcrQualityScore(cachedResult);

    manifest.ocrResult = cachedResult as unknown as Record<string, unknown>;
    manifest.ocrProcessedAt = new Date(processedAt);
    manifest.ocrQualityScore = qualityScore;

    await this.manifestRepository.save(manifest);
  }

  async getCachedOcrResult(
    manifest: ManifestEntity,
  ): Promise<OcrResultDto | null> {
    if (!manifest.ocrResult) {
      return null;
    }
    return manifest.ocrResult as unknown as OcrResultDto;
  }

  async processOcrForManifest(
    manifest: ManifestEntity,
    options: { force?: boolean; ocrModelId?: string } = {},
  ): Promise<OcrResultDto> {
    if (manifest.ocrResult && !options.force) {
      return manifest.ocrResult as unknown as OcrResultDto;
    }

    const ocrModel = options.ocrModelId
      ? await this.modelRepository.findOne({
          where: { id: options.ocrModelId },
        })
      : manifest.group?.project?.ocrModelId
        ? await this.modelRepository.findOne({
            where: { id: manifest.group.project.ocrModelId },
          })
        : null;

    if (options.ocrModelId && !ocrModel) {
      throw new NotFoundException(
        `OCR model ${options.ocrModelId} not found`,
      );
    }

    const fileBuffer = await this.fileSystem.readFile(manifest.storagePath);
    const { response, processingTimeMs } = await this.runOcrRequest(
      fileBuffer,
      ocrModel ?? undefined,
    );
    const cachedResult = buildCachedOcrResult(
      response,
      processingTimeMs,
      ocrModel ?? undefined,
    );
    await this.persistOcrResult(manifest, cachedResult);
    return cachedResult;
  }

  private async retryOcrIfNeeded(
    fileBuffer: Buffer,
    state: ExtractionWorkflowState,
    ocrModel?: ModelEntity,
  ): Promise<void> {
    while (state.ocrResult && !state.ocrResult.success) {
      if (!this.canRetryOcr(state)) {
        throw new InternalServerErrorException(
          state.ocrResult.error ??
            'OCR failed after retries',
        );
      }

      state.ocrRetryCount += 1;
      await this.delayWithBackoff(state.ocrRetryCount);
      state.ocrResult = await this.executeOcr(fileBuffer, state, ocrModel);
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
  ): Promise<ExtractionStateResult> {
    // Check if vision is required and available
    const requiresVision = state.strategy !== ExtractionStrategy.OCR_FIRST;
    const supportsVision = providerConfig
      ? (providerConfig.supportsVision ??
        this.llmService.providerSupportsVision(providerConfig.type, providerConfig.modelName ?? undefined))
      : false;

    if (requiresVision && !supportsVision) {
      return {
        data: {},
        success: false,
        error: `Extraction strategy ${state.strategy} requires vision support, but model does not support it`,
        retryCount: state.extractionRetryCount,
      };
    }

    // For vision-only strategies, we need converted pages
    if (state.strategy === ExtractionStrategy.VISION_ONLY && !state.convertedPages?.length) {
      return {
        data: {},
        success: false,
        error: 'VISION_ONLY strategy requires converted pages, but none are available',
        retryCount: state.extractionRetryCount,
      };
    }

    const previousExtraction = state.extractionResult;
    const useReExtract =
      state.extractionRetryCount > 0 && Boolean(previousExtraction);

    // Build messages based on strategy
    let messages: LlmChatMessage[];

    if (state.strategy === ExtractionStrategy.VISION_ONLY) {
      // Vision-only: use images directly
      messages = this.buildVisionOnlyMessages(
        state,
        systemPrompt,
        reExtractSystemPrompt,
        useReExtract,
        previousExtraction,
        schema,
        rules,
        customPrompt,
      );
    } else if (state.strategy === ExtractionStrategy.VISION_FIRST) {
      // Vision-first: use images with OCR as fallback context
      messages = this.buildVisionFirstMessages(
        state,
        systemPrompt,
        reExtractSystemPrompt,
        useReExtract,
        previousExtraction,
        schema,
        rules,
        contextOverride,
        customPrompt,
      );
    } else if (state.strategy === ExtractionStrategy.TWO_STAGE) {
      // Two-stage: combine vision and OCR
      messages = this.buildTwoStageMessages(
        state,
        systemPrompt,
        reExtractSystemPrompt,
        useReExtract,
        previousExtraction,
        schema,
        rules,
        contextOverride,
        customPrompt,
      );
    } else {
      // OCR_FIRST: traditional OCR-based extraction
      messages = this.buildOcrFirstMessages(
        state,
        systemPrompt,
        reExtractSystemPrompt,
        useReExtract,
        previousExtraction,
        schema,
        rules,
        contextOverride,
        customPrompt,
      );
    }

    // Build LLM options with structured output if supported
    const llmOptions: {
      responseFormat?: LlmResponseFormat;
    } = {};

    if (schema && providerConfig) {
      const supportsStructuredOutput =
        providerConfig.supportsStructuredOutput ??
        this.llmService.providerSupportsStructuredOutput(
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
      const tokenUsage = this.normalizeTokenUsage(completion.usage);

      // Use ajv validation if schema is provided, otherwise use basic validation
      let validation: ExtractionValidationResult;
      if (schema) {
        const ajvResult = this.schemasService.validateWithRequiredFields({
          jsonSchema: schema.jsonSchema as Record<string, unknown>,
          data,
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
      return {
        data: {},
        success: false,
        error: `Data extraction failed: ${this.formatError(error)}`,
        retryCount: state.extractionRetryCount,
      };
    }
  }

  private buildVisionOnlyMessages(
    state: ExtractionWorkflowState,
    systemPrompt: string,
    reExtractSystemPrompt: string,
    useReExtract: boolean,
    previousExtraction?: ExtractionStateResult,
    schema?: SchemaEntity | null,
    rules: SchemaRuleEntity[] = [],
    customPrompt?: string,
  ): LlmChatMessage[] {
    const pages = state.convertedPages ?? [];
    const imageBuffers = pages.map((p) => ({ buffer: p.buffer, mimeType: p.mimeType }));

    if (!schema) {
      throw new BadRequestException('Schema is required for extraction');
    }

    let userPrompt = this.promptBuilderService.buildExtractionPrompt(
      '',
      schema,
      rules,
    );
    if (useReExtract && previousExtraction) {
      userPrompt = this.promptBuilderService.buildReExtractPrompt(
        '',
        previousExtraction.data,
        previousExtraction.validation?.missingFields,
        previousExtraction.error,
        schema,
        rules,
      );
      userPrompt += '\n\nRe-examine the document images and correct missing or incorrect fields.';
    }
    if (customPrompt) {
      userPrompt += `\n\nAdditional instructions:\n${customPrompt}`;
    }

    return [
      {
        role: 'system',
        content: useReExtract ? reExtractSystemPrompt : systemPrompt,
      },
      this.llmService.createVisionMessageFromBuffers(userPrompt, imageBuffers),
    ];
  }

  private buildVisionFirstMessages(
    state: ExtractionWorkflowState,
    systemPrompt: string,
    reExtractSystemPrompt: string,
    useReExtract: boolean,
    previousExtraction?: ExtractionStateResult,
    schema?: SchemaEntity | null,
    rules: SchemaRuleEntity[] = [],
    contextOverride?: string,
    customPrompt?: string,
  ): LlmChatMessage[] {
    const pages = state.convertedPages ?? [];
    const imageBuffers = pages.map((p) => ({ buffer: p.buffer, mimeType: p.mimeType }));

    if (!schema) {
      throw new BadRequestException('Schema is required for extraction');
    }

    const ocrMarkdown =
      contextOverride ??
      (state.ocrResult?.success ? state.ocrResult.markdown : '');
    let userPrompt = this.promptBuilderService.buildExtractionPrompt(
      ocrMarkdown,
      schema,
      rules,
    );

    if (useReExtract && previousExtraction) {
      userPrompt = this.promptBuilderService.buildReExtractPrompt(
        ocrMarkdown,
        previousExtraction.data,
        previousExtraction.validation?.missingFields,
        previousExtraction.error,
        schema,
        rules,
      );
      userPrompt += '\n\nRe-examine the document images and correct missing or incorrect fields.';
    }
    if (customPrompt) {
      userPrompt += `\n\nAdditional instructions:\n${customPrompt}`;
    }

    return [
      {
        role: 'system',
        content: useReExtract ? reExtractSystemPrompt : systemPrompt,
      },
      this.llmService.createVisionMessageFromBuffers(userPrompt, imageBuffers),
    ];
  }

  private buildTwoStageMessages(
    state: ExtractionWorkflowState,
    systemPrompt: string,
    reExtractSystemPrompt: string,
    useReExtract: boolean,
    previousExtraction?: ExtractionStateResult,
    schema?: SchemaEntity | null,
    rules: SchemaRuleEntity[] = [],
    contextOverride?: string,
    customPrompt?: string,
  ): LlmChatMessage[] {
    const pages = state.convertedPages ?? [];
    const imageBuffers = pages.map((p) => ({ buffer: p.buffer, mimeType: p.mimeType }));

    if (!schema) {
      throw new BadRequestException('Schema is required for extraction');
    }

    const ocrMarkdown =
      contextOverride ??
      (state.ocrResult?.success ? state.ocrResult.markdown : '');
    let userPrompt = this.promptBuilderService.buildExtractionPrompt(
      ocrMarkdown,
      schema,
      rules,
    );

    if (useReExtract && previousExtraction) {
      userPrompt = this.promptBuilderService.buildReExtractPrompt(
        ocrMarkdown,
        previousExtraction.data,
        previousExtraction.validation?.missingFields,
        previousExtraction.error,
        schema,
        rules,
      );
      userPrompt += '\n\nRe-examine both images and OCR text, then correct missing or incorrect fields.';
    }
    if (customPrompt) {
      userPrompt += `\n\nAdditional instructions:\n${customPrompt}`;
    }

    return [
      {
        role: 'system',
        content: useReExtract ? reExtractSystemPrompt : systemPrompt,
      },
      this.llmService.createVisionMessageFromBuffers(userPrompt, imageBuffers),
    ];
  }

  private buildOcrFirstMessages(
    state: ExtractionWorkflowState,
    systemPrompt: string,
    reExtractSystemPrompt: string,
    useReExtract: boolean,
    previousExtraction?: ExtractionStateResult,
    schema?: SchemaEntity | null,
    rules: SchemaRuleEntity[] = [],
    contextOverride?: string,
    customPrompt?: string,
  ): LlmChatMessage[] {
    const ocrResult = state.ocrResult;
    if (!ocrResult || !ocrResult.success) {
      throw new InternalServerErrorException(
        'OCR result not available for OCR_FIRST strategy',
      );
    }

    if (!schema) {
      throw new BadRequestException('Schema is required for extraction');
    }

    const ocrMarkdown = contextOverride ?? ocrResult.markdown;
    let prompt =
      useReExtract && previousExtraction
        ? this.promptBuilderService.buildReExtractPrompt(
            ocrMarkdown,
            previousExtraction.data,
            previousExtraction.validation?.missingFields,
            previousExtraction.error,
            schema,
            rules,
          )
        : this.promptBuilderService.buildExtractionPrompt(
            ocrMarkdown,
            schema,
            rules,
          );
    if (customPrompt) {
      prompt += `\n\nAdditional instructions:\n${customPrompt}`;
    }

    return [
      {
        role: 'system',
        content: useReExtract ? reExtractSystemPrompt : systemPrompt,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];
  }

  private async saveResult(
    manifest: ManifestEntity,
    state: ExtractionWorkflowState,
  ): Promise<void> {
    const extraction = state.extractionResult;
    if (!extraction || !extraction.success) {
      throw new InternalServerErrorException(
        'Cannot save: extraction failed',
      );
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

  private buildLlmProviderConfig(
    llmModel?: ModelEntity,
  ): LlmProviderConfig | undefined {
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

  private buildOcrOverrides(
    ocrModel?: ModelEntity,
  ): {
    baseUrl?: string;
    apiKey?: string;
    timeoutMs?: number;
    maxRetries?: number;
  } | undefined {
    if (!ocrModel) {
      return undefined;
    }

    const parameters = ocrModel.parameters ?? {};
    return {
      baseUrl: this.getStringParam(parameters, 'baseUrl'),
      apiKey: this.getStringParam(parameters, 'apiKey'),
      timeoutMs: this.getNumberParam(parameters, 'timeout'),
      maxRetries: this.getNumberParam(parameters, 'maxRetries'),
    };
  }

  private ensureModelCategory(
    model: ModelEntity,
    expectedCategory: 'ocr' | 'llm',
  ): void {
    const schema = adapterRegistry.getSchema(model.adapterType);
    if (!schema) {
      throw new BadRequestException(
        `Model ${model.id} has unknown adapter type`,
      );
    }
    if (schema.category !== expectedCategory) {
      throw new BadRequestException(
        `Model ${model.id} is not a valid ${expectedCategory} model`,
      );
    }
  }

  private getLlmSupportsVision(model: ModelEntity): boolean {
    const parameters = model.parameters ?? {};
    const explicit = this.getBooleanParam(parameters, 'supportsVision');
    if (explicit !== undefined) {
      return explicit;
    }
    return this.llmService.providerSupportsVision(
      model.adapterType,
      this.getStringParam(parameters, 'modelName'),
    );
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
    const totalTokens =
      usage.total_tokens ?? promptTokens + completionTokens;
    return {
      promptTokens,
      completionTokens,
      totalTokens,
    };
  }

  private calculateCostSummary(
    state: ExtractionWorkflowState,
    ocrModel?: ModelEntity,
    llmModel?: ModelEntity,
  ): { ocrCost: number; llmCost: number } {
    const pageCount = this.resolvePageCount(state);
    const tokenUsage = state.extractionResult?.tokenUsage;

    const ocrCost = ocrModel
      ? this.modelPricingService.calculateOcrCost(
          pageCount,
          ocrModel.pricing,
        )
      : 0;

    const llmCost = llmModel && tokenUsage
      ? this.modelPricingService.calculateLlmCost(
          tokenUsage.promptTokens,
          tokenUsage.completionTokens,
          llmModel.pricing,
        )
      : 0;

    return { ocrCost, llmCost };
  }

  private resolvePageCount(state: ExtractionWorkflowState): number {
    if (state.ocrResult?.layout?.num_pages) {
      return state.ocrResult.layout.num_pages;
    }
    if (state.ocrResult?.cachedResult?.document?.pages) {
      return state.ocrResult.cachedResult.document.pages;
    }
    if (state.convertedPages?.length) {
      return state.convertedPages.length;
    }
    return 0;
  }

  private mergeFieldReExtractResult(
    base: ExtractedData,
    patch: ExtractedData,
    fieldPath: string,
  ): ExtractedData {
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

  private getSystemPrompt(
    schema: SchemaEntity | null,
    override?: string,
  ): string {
    if (override) {
      return override;
    }
    if (schema?.systemPromptTemplate) {
      return schema.systemPromptTemplate;
    }
    return this.promptsService.getSystemPrompt();
  }

  private getReExtractPrompt(
    schema: SchemaEntity | null,
    override?: string,
  ): string {
    if (override) {
      return override;
    }
    if (schema?.systemPromptTemplate) {
      return schema.systemPromptTemplate;
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
      throw new InternalServerErrorException(
        'Invalid extraction result: not an object',
      );
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
    throw new BadRequestException(message);
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

  /**
   * Get MIME type from filename extension.
   * Used for image files in vision-based extraction.
   */
  private getMimeTypeFromFilename(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
    };
    return mimeTypes[ext] || 'image/png';
  }
}
