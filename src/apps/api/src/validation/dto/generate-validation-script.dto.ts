import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class GenerateValidationScriptDto {
  @IsString()
  llmModelId!: string;

  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsObject()
  structured!: Record<string, unknown>;
}
