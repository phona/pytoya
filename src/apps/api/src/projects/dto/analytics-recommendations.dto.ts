export type RecommendationSeverity = 'info' | 'warning' | 'critical';

export interface AnalyticsEvidenceDto {
  labelKey: string;
  labelVars?: Record<string, string | number>;
  value?: string;
}

export interface AnalyticsRecommendationDto {
  id: string;
  severity: RecommendationSeverity;
  titleKey: string;
  titleVars?: Record<string, string | number>;
  evidence: AnalyticsEvidenceDto[];
  actionHref?: string;
  actionLabelKey?: string;
}

export class AnalyticsRecommendationsResponseDto {
  generatedAt!: string;
  recommendations!: AnalyticsRecommendationDto[];
}
