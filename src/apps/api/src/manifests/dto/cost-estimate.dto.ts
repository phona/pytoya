export class CostEstimateDto {
  manifestCount!: number;
  estimatedTokensMin!: number;
  estimatedTokensMax!: number;
  estimatedCostMin!: number;
  estimatedCostMax!: number;
  estimatedTextCost!: number;
  estimatedLlmCostMin!: number;
  estimatedLlmCostMax!: number;
  currency!: string;
}
