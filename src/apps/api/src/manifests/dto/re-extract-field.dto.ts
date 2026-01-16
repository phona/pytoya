import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReExtractFieldDto {
  @IsString()
  @IsNotEmpty()
  fieldName!: string;

  @IsOptional()
  @IsString()
  llmModelId?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  promptId?: number;
}
