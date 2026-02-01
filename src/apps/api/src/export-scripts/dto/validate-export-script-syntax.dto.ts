import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateExportScriptSyntaxDto {
  @IsString()
  @IsNotEmpty()
  script!: string;
}

