import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { ERROR_CODES } from '../common/errors/error-codes';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    if (err || !user) {
      const message =
        typeof info?.message === 'string'
          ? info.message
          : err instanceof Error
            ? err.message
            : 'Authentication required';

      const normalized = message.toLowerCase();
      const missingToken = normalized.includes('no auth token');

      throw new UnauthorizedException({
        code: missingToken ? ERROR_CODES.AUTH_MISSING_TOKEN : ERROR_CODES.AUTH_INVALID_TOKEN,
        message: missingToken ? 'Authentication required' : 'Invalid token',
      });
    }

    return user as TUser;
  }
}
