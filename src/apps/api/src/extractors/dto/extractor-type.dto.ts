import { ExtractorParamSchema } from '../../text-extractor/types/extractor.types';

export class ExtractorTypeDto {
  id!: string;
  name!: string;
  description!: string;
  version!: string;
  category!: string;
  paramsSchema!: ExtractorParamSchema;
  supportedFormats!: string[];
  pricingSchema?: ExtractorParamSchema;
}
