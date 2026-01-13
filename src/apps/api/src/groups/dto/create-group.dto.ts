import { Type } from 'class-transformer';
import { IsInt, IsString, MinLength } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  @Type(() => Number)
  projectId!: number;
}
