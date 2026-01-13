import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class JobsFilterDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projectId?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  offset?: number;
}
