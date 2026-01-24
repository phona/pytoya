import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class DeleteManifestsBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  manifestIds!: number[];
}

export class DeleteManifestsBulkResponseDto {
  deletedCount!: number;
}
