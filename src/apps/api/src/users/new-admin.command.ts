import { Command, CommandRunner, Option } from 'nest-commander';

import { AdminSeedService } from './admin-seed.service';

@Command({ name: 'newadmin', description: 'Seed the default admin user' })
export class NewAdminCommand extends CommandRunner {
  constructor(private readonly adminSeedService: AdminSeedService) {
    super();
  }

  async run(
    _params: string[],
    options: { username: string; password: string },
  ): Promise<void> {
    await this.adminSeedService.seedAdminIfMissing(
      options.username,
      options.password,
    );
  }

  @Option({
    flags: '-u, --username <username>',
    description: 'Admin username',
    required: true,
  })
  parseUsername(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --password <password>',
    description: 'Admin password',
    required: true,
  })
  parsePassword(val: string): string {
    return val;
  }
}
