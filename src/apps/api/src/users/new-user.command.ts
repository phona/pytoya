import { Logger } from '@nestjs/common';
import { validateSync } from 'class-validator';
import { Command, CommandRunner, Option } from 'nest-commander';

import { UserEntity, UserRole } from '../entities/user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import { UsersService } from './users.service';

@Command({
  name: 'newuser',
  description: 'Create a new non-admin user (create-only)',
})
export class NewUserCommand extends CommandRunner {
  private readonly logger = new Logger(NewUserCommand.name);

  constructor(private readonly usersService: UsersService) {
    super();
  }

  async run(
    _params: string[],
    options: { username: string; password: string },
  ): Promise<void> {
    const registerDto = new RegisterDto();
    registerDto.username = options.username;
    registerDto.password = options.password;

    const errors = validateSync(registerDto);
    if (errors.length > 0) {
      const details = errors
        .map((error) =>
          error.constraints ? JSON.stringify(error.constraints) : error.property,
        )
        .join(', ');
      throw new Error(`Invalid username/password: ${details}`);
    }

    const existingUser = await this.usersService.findByUsername(
      registerDto.username,
    );
    if (existingUser) {
      this.logger.log('User already exists; skipping (create-only)');
      return;
    }

    const passwordHash = await UserEntity.hashPassword(registerDto.password);
    await this.usersService.create({
      username: registerDto.username,
      password: passwordHash,
      role: UserRole.USER,
    });

    this.logger.log('Created new user');
  }

  @Option({
    flags: '-u, --username <username>',
    description: 'Username',
    required: true,
  })
  parseUsername(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --password <password>',
    description: 'Password',
    required: true,
  })
  parsePassword(val: string): string {
    return val;
  }
}

