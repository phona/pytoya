import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OcrPricingDto {
  @IsNumber()
  @Min(0)
  pricePerPage!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumCharge?: number;
}

export class LlmPricingDto {
  @IsNumber()
  @Min(0)
  inputPrice!: number;

  @IsNumber()
  @Min(0)
  outputPrice!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumCharge?: number;
}

export class ModelPricingDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => OcrPricingDto)
  ocr?: OcrPricingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LlmPricingDto)
  llm?: LlmPricingDto;
}

export class UpdateModelPricingDto {
  @ValidateNested()
  @Type(() => ModelPricingDto)
  pricing!: ModelPricingDto;
}
