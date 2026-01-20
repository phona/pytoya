import { IsOptional, IsString } from 'class-validator';

export class TriggerOcrDto {
  @IsOptional()
  @IsString()
  ocrModelId?: string;
}
