import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ExportManifestsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(5000)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  manifestIds!: number[];
}
