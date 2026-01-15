import { Injectable, Logger } from '@nestjs/common';

import { UserEntity, UserRole } from '../entities/user.entity';
import { UsersService } from './users.service';

@Injectable()
export class AdminSeedService {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly usersService: UsersService,
  ) {}

  async seedAdminIfMissing(username: string, password: string): Promise<void> {
    if (!username || !password) {
      this.logger.error(
        'Admin seed skipped: username and password must be provided as arguments',
      );
      return;
    }

    const existingAdmin = await this.usersService.findAdmin();
    if (existingAdmin) {
      return;
    }

    const passwordHash = await UserEntity.hashPassword(password);
    await this.usersService.create({
      username,
      password: passwordHash,
      role: UserRole.ADMIN,
    });
    this.logger.log('Seeded default admin user');
  }
}
