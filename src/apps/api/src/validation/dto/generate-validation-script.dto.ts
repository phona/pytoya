import { IsInt, IsNotEmpty, IsObject, IsString, Min } from 'class-validator';

export class GenerateValidationScriptDto {
  @IsInt()
  @Min(1)
  providerId!: number;

  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsObject()
  structured!: Record<string, unknown>;
}
