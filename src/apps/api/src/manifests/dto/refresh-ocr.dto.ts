import { IsOptional, IsString } from 'class-validator';

export class RefreshOcrDto {
  @IsOptional()
  @IsString()
  textExtractorId?: string;
}

