export class ExtractorPresetDto {
  id!: string;
  name!: string;
  description?: string;
  extractorType!: string;
  config!: Record<string, unknown>;
}
