import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ManifestEntity } from '../entities/manifest.entity';
import { ModelEntity } from '../entities/model.entity';
import { ExtractorEntity } from '../entities/extractor.entity';
import { OcrResultDto } from './dto/ocr-result.dto';
import { CostEstimateDto } from './dto/cost-estimate.dto';
import { ModelPricingService } from '../models/model-pricing.service';
import { PricingConfig } from '../text-extractor/types/extractor.types';

type CostEstimateInput = {
  manifests: ManifestEntity[];
  llmModelId?: string;
  textExtractorId?: string;
};

type FieldCostEstimateInput = {
  manifest: ManifestEntity;
  fieldName: string;
  snippet: string;
  llmModelId?: string;
};

@Injectable()
export class CostEstimateService {
  constructor(
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    @InjectRepository(ExtractorEntity)
    private readonly extractorRepository: Repository<ExtractorEntity>,
    private readonly modelPricingService: ModelPricingService,
  ) {}

  async estimateCost(input: CostEstimateInput): Promise<CostEstimateDto> {
    const { manifests, llmModelId, textExtractorId } = input;
    if (manifests.length === 0) {
      throw new BadRequestException('No manifests provided for cost estimate');
    }

    const resolvedLlmModelId =
      llmModelId ?? manifests[0].group?.project?.llmModelId ?? undefined;
    if (!resolvedLlmModelId) {
      throw new BadRequestException('LLM model is required for cost estimation');
    }

    const resolvedExtractorId =
      textExtractorId ?? manifests[0].group?.project?.textExtractorId ?? undefined;

    const [llmModel, extractor] = await Promise.all([
      this.modelRepository.findOne({
        where: { id: resolvedLlmModelId },
      }),
      resolvedExtractorId
        ? this.extractorRepository.findOne({
            where: { id: resolvedExtractorId },
          })
        : Promise.resolve(null),
    ]);

    if (!llmModel) {
      throw new BadRequestException(
        `LLM model ${resolvedLlmModelId} not found`,
      );
    }

    const tokenEstimates = manifests.map((manifest) =>
      this.estimateTokensFromOcr(manifest.ocrResult),
    );

    const pagesTotal = manifests.reduce(
      (sum, manifest) => sum + this.resolvePageCount(manifest.ocrResult),
      0,
    );
    const tokensMin = tokenEstimates.reduce(
      (sum, estimate) => sum + estimate.min,
      0,
    );
    const tokensMax = tokenEstimates.reduce(
      (sum, estimate) => sum + estimate.max,
      0,
    );

    const textCost = extractor
      ? this.calculateTextCostEstimate(
          extractor.config?.pricing as PricingConfig | undefined,
          pagesTotal,
          tokensMax,
        )
      : 0;
    const llmCostMin = this.modelPricingService.calculateLlmCost(
      tokensMin,
      Math.round(tokensMin * 0.2),
      llmModel.pricing,
    );
    const llmCostMax = this.modelPricingService.calculateLlmCost(
      tokensMax,
      Math.round(tokensMax * 0.3),
      llmModel.pricing,
    );

    return {
      manifestCount: manifests.length,
      estimatedTokensMin: tokensMin,
      estimatedTokensMax: tokensMax,
      estimatedCostMin: textCost + llmCostMin,
      estimatedCostMax: textCost + llmCostMax,
      estimatedTextCost: textCost,
      estimatedLlmCostMin: llmCostMin,
      estimatedLlmCostMax: llmCostMax,
      currency: (extractor?.config?.pricing as PricingConfig | undefined)?.currency ?? this.modelPricingService.getCurrency(llmModel.pricing),
    };
  }

  async estimateFieldCost(
    input: FieldCostEstimateInput,
  ): Promise<{ cost: number; currency: string; tokens: number }> {
    const { manifest, snippet, llmModelId } = input;
    const resolvedLlmModelId =
      llmModelId ?? manifest.group?.project?.llmModelId ?? undefined;
    if (!resolvedLlmModelId) {
      throw new BadRequestException('LLM model is required for cost estimation');
    }

    const llmModel = await this.modelRepository.findOne({
      where: { id: resolvedLlmModelId },
    });
    if (!llmModel) {
      throw new BadRequestException(
        `LLM model ${resolvedLlmModelId} not found`,
      );
    }

    const textLength = snippet?.length ?? 0;
    const inputTokens = Math.max(1, Math.ceil(textLength / 4));
    const outputTokens = Math.max(1, Math.round(inputTokens * 0.1));
    const cost = this.modelPricingService.calculateLlmCost(
      inputTokens,
      outputTokens,
      llmModel.pricing,
    );

    return {
      cost,
      currency: this.modelPricingService.getCurrency(llmModel.pricing),
      tokens: inputTokens,
    };
  }

  estimateTokensFromOcr(
    ocrResult: ManifestEntity['ocrResult'],
  ): { min: number; max: number } {
    if (!ocrResult) {
      return { min: 0, max: 0 };
    }

    const parsed = ocrResult as OcrResultDto & Record<string, unknown>;
    const textLength = this.extractTextLength(parsed);
    if (!textLength) {
      return { min: 0, max: 0 };
    }

    const estimatedTokens = Math.ceil(textLength / 4);
    const min = Math.max(1, Math.floor(estimatedTokens * 0.8));
    const max = Math.max(min, Math.ceil(estimatedTokens * 1.2));
    return { min, max };
  }

  private extractTextLength(result: OcrResultDto & Record<string, unknown>): number {
    if (Array.isArray(result.pages)) {
      return result.pages.reduce((sum, page) => {
        return sum + (page?.text?.length ?? 0);
      }, 0);
    }

    if (typeof (result as { raw_text?: string }).raw_text === 'string') {
      return (result as { raw_text?: string }).raw_text?.length ?? 0;
    }

    if (typeof (result as { markdown?: string }).markdown === 'string') {
      return (result as { markdown?: string }).markdown?.length ?? 0;
    }

    return 0;
  }

  private resolvePageCount(ocrResult: ManifestEntity['ocrResult']): number {
    if (!ocrResult) {
      return 0;
    }
    const parsed = ocrResult as OcrResultDto & Record<string, unknown>;
    if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      return parsed.pages.length;
    }
    if (
      parsed.document &&
      typeof parsed.document.pages === 'number' &&
      parsed.document.pages > 0
    ) {
      return parsed.document.pages;
    }

    const raw = parsed.rawResponse as Record<string, unknown> | undefined;
    const layoutParsingResults = raw?.layoutParsingResults as unknown;
    if (Array.isArray(layoutParsingResults)) {
      return layoutParsingResults.length;
    }
    return 0;
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
      const cost = (pricing.pricePerPage ?? 0) * pagesTotal;
      return pricing.minimumCharge ? Math.max(cost, pricing.minimumCharge) : cost;
    }

    if (pricing.mode === 'fixed') {
      const cost = pricing.fixedCost ?? 0;
      return pricing.minimumCharge ? Math.max(cost, pricing.minimumCharge) : cost;
    }

    if (pricing.mode === 'token') {
      const inputCost = pricing.inputPricePerMillionTokens
        ? (tokensMax / 1_000_000) * pricing.inputPricePerMillionTokens
        : 0;
      const outputCost = pricing.outputPricePerMillionTokens
        ? (Math.round(tokensMax * 0.2) / 1_000_000) * pricing.outputPricePerMillionTokens
        : 0;
      const total = inputCost + outputCost;
      return pricing.minimumCharge ? Math.max(total, pricing.minimumCharge) : total;
    }

    return 0;
  }
}
