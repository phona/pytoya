import { IsArray, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class BatchValidationDto {
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  manifestIds!: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  scriptIds?: number[];
}
