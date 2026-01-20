import { IsString, MinLength } from 'class-validator';

export class UpdateProjectExtractorDto {
  @IsString()
  @MinLength(1)
  textExtractorId!: string;
}
