import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyCropDto {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsInt()
  page!: number;

  @IsString()
  @IsNotEmpty()
  correctedText!: string;

  @IsOptional()
  @IsArray()
  adjustedBbox?: number[];
}
