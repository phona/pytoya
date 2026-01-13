import { Type } from 'class-transformer';
import { IsInt, IsString, MinLength } from 'class-validator';

export class CreateManifestDto {
  @IsString()
  @MinLength(1)
  filename!: string;

  @IsInt()
  @Type(() => Number)
  groupId!: number;
}
