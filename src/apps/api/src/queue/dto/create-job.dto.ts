import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateJobDto {
  @IsNumber()
  @Type(() => Number)
  manifestId!: number;

  @IsOptional()
  @IsString()
  llmModelId?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  promptId?: number;
}
