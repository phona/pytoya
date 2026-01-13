import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { PromptType } from '../../entities/prompt.entity';

export class CreatePromptDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(PromptType)
  type!: PromptType;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  variables?: string[];
}
