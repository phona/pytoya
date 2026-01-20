import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ManifestEntity } from '../entities/manifest.entity';
import { ModelEntity } from '../entities/model.entity';
import { OcrResultDto } from './dto/ocr-result.dto';
import { CostEstimateDto } from './dto/cost-estimate.dto';
import { ModelPricingService } from '../models/model-pricing.service';

type CostEstimateInput = {
  manifests: ManifestEntity[];
  llmModelId?: string;
  ocrModelId?: string;
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
    private readonly modelPricingService: ModelPricingService,
  ) {}

  async estimateCost(input: CostEstimateInput): Promise<CostEstimateDto> {
    const { manifests, llmModelId, ocrModelId } = input;
    if (manifests.length === 0) {
      throw new BadRequestException('No manifests provided for cost estimate');
    }

    const resolvedLlmModelId =
      llmModelId ?? manifests[0].group?.project?.llmModelId ?? undefined;
    if (!resolvedLlmModelId) {
      throw new BadRequestException('LLM model is required for cost estimation');
    }

    const resolvedOcrModelId =
      ocrModelId ?? manifests[0].group?.project?.ocrModelId ?? undefined;

    const [llmModel, ocrModel] = await Promise.all([
      this.modelRepository.findOne({
        where: { id: resolvedLlmModelId },
      }),
      resolvedOcrModelId
        ? this.modelRepository.findOne({
            where: { id: resolvedOcrModelId },
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

    const ocrCost = ocrModel
      ? this.modelPricingService.calculateOcrCost(pagesTotal, ocrModel.pricing)
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
      estimatedCostMin: ocrCost + llmCostMin,
      estimatedCostMax: ocrCost + llmCostMax,
      estimatedOcrCost: ocrCost,
      estimatedLlmCostMin: llmCostMin,
      estimatedLlmCostMax: llmCostMax,
      currency: this.modelPricingService.getCurrency(
        llmModel.pricing ?? ocrModel?.pricing,
      ),
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
}
