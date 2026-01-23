import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  Validate,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdapterParametersConstraint,
  AdapterTypeConstraint,
} from './create-model.dto';
import { ModelPricingDto } from './update-model-pricing.dto';

export class UpdateModelDto {
  @ApiPropertyOptional({ example: 'OpenAI GPT-4o' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'openai' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @Validate(AdapterTypeConstraint)
  adapterType?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-...',
      modelName: 'gpt-4o',
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateIf((obj) => obj.parameters !== undefined)
  @Validate(AdapterParametersConstraint)
  @Type(() => Object)
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'Production model' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: ModelPricingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ModelPricingDto)
  pricing?: ModelPricingDto;
}
