import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ReExtractDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  providerId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  promptId?: number;
}
