import { IsString, MinLength } from 'class-validator';

export class OptimizePromptDto {
  @IsString()
  @MinLength(5)
  description!: string;
}
