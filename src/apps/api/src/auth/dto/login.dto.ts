import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
    message: 'Username must start with a letter and use only letters, numbers, _ or -',
  })
  username!: string;

  @IsString()
  password!: string;
}
