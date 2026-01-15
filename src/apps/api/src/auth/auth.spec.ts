import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserEntity } from '../entities/user.entity';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByUsername' | 'create'>>;

  beforeEach(async () => {
    usersService = {
      findByUsername: jest.fn(),
      create: jest.fn(),
    };
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('test-token'),
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
  });
});
