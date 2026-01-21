import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GeneratePromptRulesDto {
  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsOptional()
  @IsString()
  currentRulesMarkdown?: string;

  @IsOptional()
  @IsString()
  previousCandidateMarkdown?: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}

