import { IsOptional, IsString } from 'class-validator';

export class TriggerOcrDto {
  @IsOptional()
  @IsString()
  textExtractorId?: string;
}
