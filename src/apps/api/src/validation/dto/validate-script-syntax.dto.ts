import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateScriptSyntaxDto {
  @IsString()
  @IsNotEmpty()
  script!: string;
}
