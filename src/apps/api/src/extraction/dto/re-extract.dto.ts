import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ReExtractDto {
  @IsOptional()
  @IsString()
  llmModelId?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  promptId?: number;
}
