import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
    message: 'Username must start with a letter and use only letters, numbers, _ or -',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/, {
    message:
      'Password must include uppercase, lowercase, number, and special character',
  })
  password!: string;
}
