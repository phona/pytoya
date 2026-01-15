import { Test } from '@nestjs/testing';

import { AdminSeedService } from './admin-seed.service';
import { NewAdminCommand } from './new-admin.command';

describe('NewAdminCommand', () => {
  it('runs the admin seed service with username and password', async () => {
    const seedAdminIfMissing = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        NewAdminCommand,
        {
          provide: AdminSeedService,
          useValue: { seedAdminIfMissing },
        },
      ],
    }).compile();

    const command = moduleRef.get(NewAdminCommand);
    await command.run([], { username: 'admin', password: 'password123' });

    expect(seedAdminIfMissing).toHaveBeenCalledTimes(1);
    expect(seedAdminIfMissing).toHaveBeenCalledWith('admin', 'password123');
  });
});
