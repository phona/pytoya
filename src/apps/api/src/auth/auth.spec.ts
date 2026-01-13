// Example backend test using NestJS testing utilities
// This demonstrates dependency injection pattern for mocking

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserEntity } from '../entities/user.entity';
import { createMockUser } from '../../test/mocks/factories';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Partial<Repository<UserEntity>>>;

  beforeEach(async () => {
    // Create mock repository with jest functions
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('test-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(UserEntity));
  });

  describe('validateUser', () => {
    it('should return null if user not found', async () => {
      userRepository.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.validateUser('notfound@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return user if credentials are valid', async () => {
      const mockUser = createMockUser({
        email: 'test@example.com',
      });
      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password');

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
        user: { id: 1, email: 'test@example.com', role: 'user' },
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
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await controller.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });
  });
});
