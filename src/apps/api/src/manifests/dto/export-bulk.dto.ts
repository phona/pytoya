import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ExportBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  manifestIds!: string[];
}
