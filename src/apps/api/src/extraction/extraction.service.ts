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
import { PromptEntity, PromptType } from '../entities/prompt.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { LlmResponseFormat } from '../llm/llm.types';
import { LlmService } from '../llm/llm.service';
import { LlmChatMessage, LlmProviderConfig } from '../llm/llm.types';
import { OcrService } from '../ocr/ocr.service';
import { PdfToImageService, ConvertedPage } from '../pdf-to-image/pdf-to-image.service';
import { PromptsService } from '../prompts/prompts.service';
import { SchemasService } from '../schemas/schemas.service';
import { IFileAccessService, FileStats } from '../file-access/file-access.service';
import { ExtractedData } from '../prompts/types/prompts.types';
import { adapterRegistry } from '../models/adapters/adapter-registry';
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
  prompt?: PromptEntity;
  reExtractPrompt?: PromptEntity;
  ocrModelId?: string;
  llmModelId?: string;
  promptId?: number;
  fieldName?: string;
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
    private readonly promptsService: PromptsService,
    private readonly schemasService: SchemasService,
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
  ): ExtractionStrategy {
    // If schema explicitly specifies a strategy, use it
    if (schema?.extractionStrategy) {
      // Validate that the strategy is compatible with the model
      if (llmModel && schema.extractionStrategy !== ExtractionStrategy.OCR_FIRST) {
        const supportsVision = this.getLlmSupportsVision(llmModel);
        if (!supportsVision) {
          this.logger.warn(
            `Schema specifies ${schema.extractionStrategy} but model doesn't support vision, falling back to OCR_FIRST`,
          );
          return ExtractionStrategy.OCR_FIRST;
        }
      }
      return schema.extractionStrategy;
    }

    // For image files, use VISION_ONLY if model supports it
    if (fileType === FileType.IMAGE) {
      const supportsVision = llmModel ? this.getLlmSupportsVision(llmModel) : false;
      if (supportsVision) {
        return ExtractionStrategy.VISION_ONLY;
      }
      // Image files require vision - if model doesn't support it, we'll fail later
      this.logger.warn('Image file uploaded but model does not support vision');
    }

    // Default to OCR_FIRST for backward compatibility
    return ExtractionStrategy.OCR_FIRST;
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

    // Load schema from project
    let schema: SchemaEntity | null = null;
    if (project?.defaultSchemaId) {
      try {
        schema = await this.schemasService.findOne(project.defaultSchemaId);
      } catch (error) {
        this.logger.warn(`Default schema ${project.defaultSchemaId} not found, using fallback`);
      }
    }

    const ocrModelFromProject = project?.ocrModelId
      ? await this.modelRepository.findOne({
          where: { id: project.ocrModelId },
        })
      : null;
    if (project?.ocrModelId && !ocrModelFromProject) {
      this.logger.warn(
        `OCR model ${project.ocrModelId} not found, using config defaults`,
      );
    }

    const llmModelFromProject = project?.llmModelId
      ? await this.modelRepository.findOne({
          where: { id: project.llmModelId },
        })
      : null;
    if (project?.llmModelId && !llmModelFromProject) {
      this.logger.warn(
        `LLM model ${project.llmModelId} not found, using config defaults`,
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

    if (ocrModel) {
      this.ensureModelCategory(ocrModel, 'ocr');
    }
    if (llmModel) {
      this.ensureModelCategory(llmModel, 'llm');
    }

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
      throw new NotFoundException(
        `Prompt ${options.promptId} not found`,
      );
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
      strategy: this.determineExtractionStrategy(schema, manifest.fileType, llmModel),
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
        state.ocrResult = await this.executeOcr(fileBuffer, state, ocrModel);
        reportProgress(40);
        await this.retryOcrIfNeeded(fileBuffer, state, ocrModel);
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
          prompt: systemPrompt,
          reExtractPrompt,
        },
        schema,
        isFieldReExtract && targetFieldName
          ? [targetFieldName]
          : schema?.requiredFields ?? this.getRequiredFields(),
      );
      reportProgress(80);

      state.status = ExtractionStatus.SAVING;
      reportProgress(90);

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
    requiredFields: string[],
  ): Promise<void> {
    const providerConfig = this.buildLlmProviderConfig(options.llmModel);
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
        state.ocrResult = await this.executeOcr(fileBuffer, state, options.ocrModel);
        await this.retryOcrIfNeeded(fileBuffer, state, options.ocrModel);
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
      const overrides = this.buildOcrOverrides(ocrModel);
      const ocrResult = await this.ocrService.processPdf(
        fileBuffer,
        overrides,
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
      );
    } else if (state.strategy === ExtractionStrategy.VISION_FIRST) {
      // Vision-first: use images with OCR as fallback context
      messages = this.buildVisionFirstMessages(
        state,
        systemPrompt,
        reExtractSystemPrompt,
        useReExtract,
        previousExtraction,
      );
    } else if (state.strategy === ExtractionStrategy.TWO_STAGE) {
      // Two-stage: combine vision and OCR
      messages = this.buildTwoStageMessages(
        state,
        systemPrompt,
        reExtractSystemPrompt,
        useReExtract,
        previousExtraction,
      );
    } else {
      // OCR_FIRST: traditional OCR-based extraction
      messages = this.buildOcrFirstMessages(
        state,
        systemPrompt,
        reExtractSystemPrompt,
        useReExtract,
        previousExtraction,
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

  private buildVisionOnlyMessages(
    state: ExtractionWorkflowState,
    systemPrompt: string,
    reExtractSystemPrompt: string,
    useReExtract: boolean,
    previousExtraction?: ExtractionStateResult,
  ): LlmChatMessage[] {
    const pages = state.convertedPages ?? [];
    const imageBuffers = pages.map((p) => ({ buffer: p.buffer, mimeType: p.mimeType }));

    let userPrompt = 'Extract structured data from these document images.';
    if (useReExtract && previousExtraction) {
      userPrompt = this.promptsService.buildReExtractPrompt(
        '',
        previousExtraction.data,
        previousExtraction.validation?.missingFields,
        previousExtraction.error,
      );
      userPrompt += '\n\nPlease re-examine the document images and correct the missing or incorrect fields.';
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
  ): LlmChatMessage[] {
    const pages = state.convertedPages ?? [];
    const imageBuffers = pages.map((p) => ({ buffer: p.buffer, mimeType: p.mimeType }));

    // For vision-first, we use images primarily but can include OCR text as context
    let userPrompt = 'Extract structured data from these document images.';
    if (state.ocrResult?.success && state.ocrResult.rawText) {
      userPrompt += `\n\nAdditional OCR text context (may be useful for small text):\n${state.ocrResult.rawText.slice(0, 5000)}`;
    }

    if (useReExtract && previousExtraction) {
      userPrompt = this.promptsService.buildReExtractPrompt(
        '',
        previousExtraction.data,
        previousExtraction.validation?.missingFields,
        previousExtraction.error,
      );
      userPrompt += '\n\nPlease re-examine the document images and correct the missing or incorrect fields.';
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
  ): LlmChatMessage[] {
    const pages = state.convertedPages ?? [];
    const imageBuffers = pages.map((p) => ({ buffer: p.buffer, mimeType: p.mimeType }));

    // Two-stage: provide both vision content and OCR text
    let userPrompt = 'Extract structured data from this document. ';
    userPrompt += 'You have both the document images and OCR text available. ';
    userPrompt += 'Use the images for visual understanding and OCR text for precise text extraction.';

    if (state.ocrResult?.success && state.ocrResult.rawText) {
      userPrompt += `\n\nOCR Text:\n${state.ocrResult.rawText}`;
    }

    if (useReExtract && previousExtraction) {
      userPrompt = this.promptsService.buildReExtractPrompt(
        state.ocrResult?.markdown ?? '',
        previousExtraction.data,
        previousExtraction.validation?.missingFields,
        previousExtraction.error,
      );
      userPrompt += '\n\nPlease re-examine both the document images and OCR text, then correct the missing or incorrect fields.';
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
  ): LlmChatMessage[] {
    const ocrResult = state.ocrResult;
    if (!ocrResult || !ocrResult.success) {
      throw new InternalServerErrorException(
        'OCR result not available for OCR_FIRST strategy',
      );
    }

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
