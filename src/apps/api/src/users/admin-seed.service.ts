import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserEntity, UserRole } from '../entities/user.entity';
import { UsersService } from './users.service';

@Injectable()
export class AdminSeedService {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async seedAdminIfMissing(): Promise<void> {
    const adminUsername = this.configService.get<string>('ADMIN_USERNAME');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminUsername || !adminPassword) {
      this.logger.error(
        'Admin seed skipped: ADMIN_USERNAME and ADMIN_PASSWORD must be set',
      );
      return;
    }

    const existingAdmin = await this.usersService.findAdmin();
    if (existingAdmin) {
      return;
    }

    const passwordHash = await UserEntity.hashPassword(adminPassword);
    await this.usersService.create({
      username: adminUsername,
      password: passwordHash,
      role: UserRole.ADMIN,
    });
    this.logger.log('Seeded default admin user');
  }
}
