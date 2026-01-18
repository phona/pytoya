import { IsObject, IsOptional } from 'class-validator';

export class ImportSchemaDto {
  @IsOptional()
  @IsObject()
  file?: unknown;
}
