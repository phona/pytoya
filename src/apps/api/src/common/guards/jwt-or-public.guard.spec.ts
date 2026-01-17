import { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtOrPublicGuard } from './jwt-or-public.guard';
import { UserRole } from '../../entities/user.entity';

const createContext = (request: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as ExecutionContext;

describe('JwtOrPublicGuard', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const usersService = {
    findById: jest.fn(),
  };
  const manifestRepository = {
    findOne: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects when no auth header is provided', async () => {
    const guard = new JwtOrPublicGuard(
      jwtService as any,
      usersService as any,
      manifestRepository as any,
    );
    const req = { headers: {}, originalUrl: '/uploads/file.pdf' };
    const context = createContext(req);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('allows access for owner', async () => {
    jwtService.verifyAsync.mockResolvedValue({ userId: 7, role: 'user' });
    usersService.findById.mockResolvedValue({ id: 7, role: UserRole.USER });
    manifestRepository.findOne.mockResolvedValue({
      group: { project: { ownerId: 7 } },
    });

    const guard = new JwtOrPublicGuard(
      jwtService as any,
      usersService as any,
      manifestRepository as any,
    );
    const req = {
      headers: { authorization: 'Bearer token' },
      originalUrl: '/uploads/file.pdf',
    };
    const context = createContext(req);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('blocks access for non-owner non-admin', async () => {
    jwtService.verifyAsync.mockResolvedValue({ userId: 5, role: 'user' });
    usersService.findById.mockResolvedValue({ id: 5, role: UserRole.USER });
    manifestRepository.findOne.mockResolvedValue({
      group: { project: { ownerId: 9 } },
    });

    const guard = new JwtOrPublicGuard(
      jwtService as any,
      usersService as any,
      manifestRepository as any,
    );
    const req = {
      headers: { authorization: 'Bearer token' },
      originalUrl: '/uploads/file.pdf',
    };
    const context = createContext(req);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('allows access for admin', async () => {
    jwtService.verifyAsync.mockResolvedValue({ userId: 2, role: 'admin' });
    usersService.findById.mockResolvedValue({ id: 2, role: UserRole.ADMIN });
    manifestRepository.findOne.mockResolvedValue({
      group: { project: { ownerId: 9 } },
    });

    const guard = new JwtOrPublicGuard(
      jwtService as any,
      usersService as any,
      manifestRepository as any,
    );
    const req = {
      headers: { authorization: 'Bearer token' },
      originalUrl: '/uploads/file.pdf',
    };
    const context = createContext(req);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
