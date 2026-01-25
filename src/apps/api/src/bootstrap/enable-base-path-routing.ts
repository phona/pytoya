import { HttpException, HttpStatus } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import type { NextFunction, Request, Response } from 'express';
import * as path from 'path';

import { ERROR_CODES } from '../common/errors/error-codes';
import { JwtOrPublicGuard } from '../common/guards/jwt-or-public.guard';
import { joinBasePath, normalizeBasePath, toGlobalApiPrefix } from './base-path';

export const enableBasePathRouting = (
  app: NestExpressApplication,
  configService: ConfigService,
) => {
  const basePath = normalizeBasePath(configService.get<string>('server.basePath'));

  // Set global prefix for all REST controllers, including an optional base path.
  app.setGlobalPrefix(toGlobalApiPrefix(basePath));

  // Serve authenticated uploads under /api/uploads (scoped by base path).
  const uploadsMountPath = joinBasePath(basePath, '/api/uploads');
  const uploadsPath = path.resolve(process.cwd(), 'uploads');
  const uploadsGuard = app.get(JwtOrPublicGuard);

  app.use(
    uploadsMountPath,
    async (req: Request, res: Response, next: NextFunction) => {
      const context = new ExecutionContextHost([req, res]);
      try {
        const allowed = await uploadsGuard.canActivate(context);
        if (allowed) {
          return next();
        }
        return res.sendStatus(HttpStatus.FORBIDDEN);
      } catch (error) {
        const requestId =
          (req as Request & { id?: string }).id ??
          (typeof req.headers['x-request-id'] === 'string'
            ? req.headers['x-request-id']
            : 'unknown');
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const exceptionResponse =
          error instanceof HttpException ? error.getResponse() : null;
        const exceptionPayload =
          exceptionResponse &&
          typeof exceptionResponse === 'object' &&
          !Array.isArray(exceptionResponse)
            ? (exceptionResponse as Record<string, unknown>)
            : null;
        const code =
          error instanceof HttpException &&
          exceptionPayload?.code &&
          typeof exceptionPayload.code === 'string'
            ? exceptionPayload.code
            : error instanceof HttpException
              ? error.name
              : ERROR_CODES.INTERNAL_SERVER_ERROR;
        const messageFromException =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : exceptionPayload?.message &&
                typeof exceptionPayload.message === 'string'
              ? exceptionPayload.message
              : undefined;
        const message =
          messageFromException ??
          (error instanceof Error ? error.message : 'An unexpected error occurred');

        return res.status(status).json({
          error: {
            code,
            message,
            requestId,
            timestamp: new Date().toISOString(),
            path: req.originalUrl ?? req.url,
          },
        });
      }
    },
  );

  app.use(uploadsMountPath, express.static(uploadsPath));
};

