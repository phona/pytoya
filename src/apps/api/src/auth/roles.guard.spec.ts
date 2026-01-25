import { Reflector } from '@nestjs/core';

import { UserRole } from '../entities/user.entity';
import { RolesGuard } from './roles.guard';

const makeContext = (options: { user?: any } = {}) =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: options.user }),
    }),
  }) as any;

describe('RolesGuard', () => {
  it('allows access when no roles are required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('denies access when user is missing', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext())).toBe(false);
  });

  it('allows admins regardless of required roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.USER]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext({ user: { role: UserRole.ADMIN } }))).toBe(true);
  });

  it('checks role membership for non-admin users', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext({ user: { role: UserRole.USER } }))).toBe(false);
  });
});

