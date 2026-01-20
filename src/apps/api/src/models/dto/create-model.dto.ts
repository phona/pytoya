import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { adapterRegistry } from '../adapters/adapter-registry';

@ValidatorConstraint({ name: 'AdapterTypeConstraint', async: false })
export class AdapterTypeConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) {
      return false;
    }
    const schema = adapterRegistry.getSchema(value);
    return Boolean(schema && schema.category === 'llm');
  }

  defaultMessage(args: ValidationArguments): string {
    return `Unsupported adapter type: ${args.value}`;
  }
}

@ValidatorConstraint({ name: 'AdapterParametersConstraint', async: false })
export class AdapterParametersConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const adapterType = (args.object as { adapterType?: string }).adapterType;
    if (!adapterType) {
      return true;
    }
    const schema = adapterRegistry.getSchema(adapterType);
    if (!schema || schema.category !== 'llm') {
      return false;
    }
    return adapterRegistry.validateParameters(adapterType, value).valid;
  }

  defaultMessage(args: ValidationArguments): string {
    const adapterType = (args.object as { adapterType?: string }).adapterType;
    if (!adapterType) {
      return 'Adapter type is required to validate parameters';
    }
    const schema = adapterRegistry.getSchema(adapterType);
    if (!schema || schema.category !== 'llm') {
      return `Unsupported adapter type: ${adapterType}`;
    }
    const result = adapterRegistry.validateParameters(adapterType, args.value);
    return result.errors.join('; ') || 'Invalid adapter parameters';
  }
}

export class CreateModelDto {
  @ApiProperty({ example: 'OpenAI GPT-4o' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'openai' })
  @IsString()
  @MinLength(1)
  @Validate(AdapterTypeConstraint)
  adapterType!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-...',
      modelName: 'gpt-4o',
      temperature: 0.7,
    },
  })
  @IsObject()
  @Validate(AdapterParametersConstraint)
  @Type(() => Object)
  parameters!: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'Production model' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
