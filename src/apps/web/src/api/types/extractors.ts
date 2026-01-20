import type { Jsonify } from '@/api/types';
import type {
  CreateExtractorDto,
  UpdateExtractorDto,
  ExtractorResponseDto,
  ExtractorCostSummaryDto,
  ExtractorTypeDto,
  ExtractorPresetDto,
  TestExtractorResponseDto,
} from '@pytoya/shared/types/extractors';

export type Extractor = Jsonify<ExtractorResponseDto>;
export type ExtractorType = ExtractorTypeDto;
export type ExtractorPreset = ExtractorPresetDto;
export type ExtractorCostSummary = Jsonify<ExtractorCostSummaryDto>;
export type TestExtractorResponse = TestExtractorResponseDto;

export type { CreateExtractorDto, UpdateExtractorDto };
