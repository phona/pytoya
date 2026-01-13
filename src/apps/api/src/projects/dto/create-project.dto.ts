import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  defaultProviderId?: string;

  @IsOptional()
  @IsString()
  defaultPromptId?: string;
}
