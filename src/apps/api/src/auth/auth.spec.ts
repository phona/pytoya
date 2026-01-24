import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { THROTTLER_LIMIT, THROTTLER_TTL } from '@nestjs/throttler/dist/throttler.constants';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserEntity } from '../entities/user.entity';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByUsername' | 'create' | 'save' | 'findById'>
  >;

  beforeEach(async () => {
    usersService = {
      findByUsername: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
    };
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('test-token'),
    };
    const configService = {
      get: jest.fn().mockReturnValue({
        enabled: true,
        thresholds: [
          { attempts: 5, duration: 15 * 60 * 1000 },
          { attempts: 10, duration: 60 * 60 * 1000 },
          { attempts: 15, permanent: true },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('should return null if user not found', async () => {
      usersService.findByUsername.mockResolvedValue(null as any);

      const result = await service.validateUser('missing-user', 'password');

      expect(result).toBeNull();
    });

    it('should return user if credentials are valid', async () => {
      const mockUser = {
        id: 1,
        username: 'test-user',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz',
        role: 'user',
      } as UserEntity;
      usersService.findByUsername.mockResolvedValue(mockUser);
      jest
        .spyOn(service as any, 'comparePassword')
        .mockResolvedValue(true);

      const result = await service.validateUser('test-user', 'password');

      expect(result).toBeDefined();
    });
  });

  describe('login', () => {
    it('locks the user after failed attempts threshold', async () => {
      const user = {
        id: 1,
        username: 'locked-user',
        password: 'hash',
        role: 'user',
        failedLoginAttempts: 4,
        lockedUntil: null,
        lastFailedLoginAt: null,
      } as UserEntity;
      usersService.findByUsername.mockResolvedValue(user);
      jest
        .spyOn(service as any, 'comparePassword')
        .mockResolvedValue(false);

      await expect(
        service.login({ username: 'locked-user', password: 'bad' }),
      ).rejects.toThrow('Invalid credentials');

      expect(usersService.save).toHaveBeenCalled();
      expect(user.failedLoginAttempts).toBe(5);
      expect(user.lockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('changePassword', () => {
    it('updates the user password hash when current password matches', async () => {
      const user = {
        id: 1,
        username: 'test-user',
        password: 'old-hash',
        role: 'user',
      } as UserEntity;

      usersService.findById.mockResolvedValue(user);
      jest
        .spyOn(service as any, 'comparePassword')
        .mockResolvedValue(true);
      jest
        .spyOn(service as any, 'hashPassword')
        .mockResolvedValue('new-hash');

      await service.changePassword(
        { id: 1 },
        { currentPassword: 'CurrentPass1!', newPassword: 'StrongPass1!' },
      );

      expect(usersService.save).toHaveBeenCalledTimes(1);
      expect(usersService.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'new-hash' }),
      );
    });

    it('rejects when current password does not match', async () => {
      const user = {
        id: 1,
        username: 'test-user',
        password: 'old-hash',
        role: 'user',
      } as UserEntity;

      usersService.findById.mockResolvedValue(user);
      jest
        .spyOn(service as any, 'comparePassword')
        .mockResolvedValue(false);

      await expect(
        service.changePassword(
          { id: 1 },
          { currentPassword: 'WrongPass1!', newPassword: 'StrongPass1!' },
        ),
      ).rejects.toThrow('Invalid current password');
    });
  });
});

describe('AuthController', () => {
  let controller: AuthController;
  let service: Partial<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn().mockResolvedValue({
        user: { id: 1, username: 'test-user', role: 'user' },
        token: 'jwt-token',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginDto = {
        username: 'test-user',
        password: 'password123',
      };

      const result = await controller.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });

    it('has rate limit metadata for login', () => {
      const limit = Reflect.getMetadata(
        `${THROTTLER_LIMIT}default`,
        AuthController.prototype.login,
      );
      const ttl = Reflect.getMetadata(
        `${THROTTLER_TTL}default`,
        AuthController.prototype.login,
      );

      expect(limit).toBe(5);
      expect(ttl).toBe(60000);
    });
  });
});
