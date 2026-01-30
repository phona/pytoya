import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AbilityFactory } from './ability.factory';
import { CHECK_POLICIES_KEY, type PolicyHandler } from './check-policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlers =
      this.reflector.getAllAndOverride<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (handlers.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: number; role?: string } | undefined;
    if (!user?.id || !user.role) {
      throw new ForbiddenException('Access denied');
    }

    const ability = this.abilityFactory.createForUser(user as any);

    for (const handler of handlers) {
      const allowed = await handler(ability);
      if (!allowed) {
        throw new ForbiddenException('Access denied');
      }
    }

    return true;
  }
}

