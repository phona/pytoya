import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class CreateJobDto {
  @IsNumber()
  @Type(() => Number)
  manifestId!: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  providerId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  promptId?: number;
}
