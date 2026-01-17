import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

type RequestWithId = Request & { id?: string };

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const headerValue = req.headers['x-request-id'];
    const requestId =
      typeof headerValue === 'string' && headerValue.trim()
        ? headerValue
        : randomUUID();

    (req as RequestWithId).id = requestId;
    res.setHeader('X-Request-ID', requestId);
    this.logger.log(`[${requestId}] ${req.method} ${req.originalUrl}`);
    next();
  }
}
