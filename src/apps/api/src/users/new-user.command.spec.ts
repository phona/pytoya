import { Test } from '@nestjs/testing';

import { UsersService } from './users.service';
import { NewUserCommand } from './new-user.command';

describe('NewUserCommand', () => {
  it('creates a user with role=user', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const findByUsername = jest.fn().mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        NewUserCommand,
        {
          provide: UsersService,
          useValue: { create, findByUsername },
        },
      ],
    }).compile();

    const command = moduleRef.get(NewUserCommand);
    await command.run([], { username: 'alice', password: 'Password123!' });

    expect(findByUsername).toHaveBeenCalledTimes(1);
    expect(findByUsername).toHaveBeenCalledWith('alice');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'alice',
        role: 'user',
      }),
    );
  });

  it('skips creation if username exists', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const findByUsername = jest.fn().mockResolvedValue({ id: 1 });

    const moduleRef = await Test.createTestingModule({
      providers: [
        NewUserCommand,
        {
          provide: UsersService,
          useValue: { create, findByUsername },
        },
      ],
    }).compile();

    const command = moduleRef.get(NewUserCommand);
    await command.run([], { username: 'alice', password: 'Password123!' });

    expect(create).not.toHaveBeenCalled();
  });
});

