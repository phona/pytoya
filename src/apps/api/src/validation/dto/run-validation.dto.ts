import { IsArray, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class RunValidationDto {
  @IsInt()
  @Type(() => Number)
  manifestId!: number;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  scriptIds?: number[];
}
