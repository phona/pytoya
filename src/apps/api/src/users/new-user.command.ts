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
    params: string[],
    options: { username: string; password: string; allowWeakPassword?: boolean },
  ): Promise<void> {
    const username = options.username ?? params[0];
    const password = options.password ?? params[1];

    const allowWeakPassword = Boolean(options.allowWeakPassword);

    if (allowWeakPassword && process.env.NODE_ENV === 'production') {
      throw new Error(
        'Refusing --allow-weak-password in production (dev-only escape hatch)',
      );
    }

    if (allowWeakPassword) {
      this.logger.warn(
        'Allowing weak password due to --allow-weak-password (dev-only)',
      );
      this.validateUsernameOrThrow(username);
      if (!password) {
        throw new Error('Invalid password: password must be provided');
      }
    } else {
      const registerDto = new RegisterDto();
      registerDto.username = username;
      registerDto.password = password;

      const errors = validateSync(registerDto);
      if (errors.length > 0) {
        const details = errors
          .map((error) =>
            error.constraints
              ? JSON.stringify(error.constraints)
              : error.property,
          )
          .join(', ');
        throw new Error(`Invalid username/password: ${details}`);
      }
    }

    const existingUser = await this.usersService.findByUsername(
      username,
    );
    if (existingUser) {
      this.logger.log('User already exists; skipping (create-only)');
      return;
    }

    const passwordHash = await UserEntity.hashPassword(password);
    await this.usersService.create({
      username,
      password: passwordHash,
      role: UserRole.USER,
    });

    this.logger.log('Created new user');
  }

  @Option({
    flags: '-u, --username <username>',
    description: 'Username',
    required: false,
  })
  parseUsername(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --password <password>',
    description: 'Password',
    required: false,
  })
  parsePassword(val: string): string {
    return val;
  }

  @Option({
    flags: '--allow-weak-password',
    description:
      'Allow passwords that violate policy (dev-only; refuses in NODE_ENV=production)',
    required: false,
  })
  parseAllowWeakPassword(val: unknown): boolean {
    if (val === undefined) return true;
    if (typeof val === 'boolean') return val;
    const normalized = String(val).trim().toLowerCase();
    return ['1', 'true', 'y', 'yes', 'on'].includes(normalized);
  }

  private validateUsernameOrThrow(username: string): void {
    if (typeof username !== 'string') {
      throw new Error('Invalid username: must be a string');
    }

    if (username.length < 3 || username.length > 50) {
      throw new Error('Invalid username: must be 3 to 50 characters');
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(username)) {
      throw new Error(
        'Invalid username: must start with a letter and use only letters, numbers, _ or -',
      );
    }
  }
}
