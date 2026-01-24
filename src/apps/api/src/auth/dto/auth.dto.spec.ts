import 'reflect-metadata';
import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

describe('Auth DTO validation', () => {
  it('accepts valid login username', async () => {
    const dto = new LoginDto();
    dto.username = 'user-name_1';
    dto.password = 'password';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid login username', async () => {
    const dto = new LoginDto();
    dto.username = '1bad';
    dto.password = 'password';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts strong password on register', async () => {
    const dto = new RegisterDto();
    dto.username = 'ValidUser';
    dto.password = 'StrongPass1!';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects weak password on register', async () => {
    const dto = new RegisterDto();
    dto.username = 'ValidUser';
    dto.password = 'weakpass';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts strong password on change password', async () => {
    const dto = new ChangePasswordDto();
    dto.currentPassword = 'CurrentPass1!';
    dto.newPassword = 'StrongPass1!';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects weak password on change password', async () => {
    const dto = new ChangePasswordDto();
    dto.currentPassword = 'CurrentPass1!';
    dto.newPassword = 'weakpass';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
