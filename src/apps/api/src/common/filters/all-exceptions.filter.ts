import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ERROR_CODES } from '../errors/error-codes';

type RequestWithId = Request & { id?: string };
type ErrorDetails = unknown;
type ErrorParams = Record<string, unknown>;

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly configService?: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId =
      request.id ??
      (typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : 'unknown');
    const path = request.originalUrl ?? request.url;

    const isProduction = (this.configService?.get<string>('server.nodeEnv') ??
      process.env.NODE_ENV) === 'production';

    const { message, code, params, details } = this.buildError(
      exception,
      isProduction,
    );

    this.logger.error(
      `[${requestId}] ${code}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      error: {
        code,
        message,
        ...(params ? { params } : {}),
        ...(details ? { details } : {}),
        requestId,
        timestamp: new Date().toISOString(),
        path,
      },
    });
  }

  private buildError(
    exception: unknown,
    isProduction: boolean,
  ): { message: string; code: string; params?: ErrorParams; details?: ErrorDetails } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const payload =
        typeof response === 'object' && response !== null ? (response as Record<string, unknown>) : null;

      const code =
        payload && typeof payload.code === 'string'
          ? payload.code
          : exception.name;

      const params =
        payload && typeof payload.params === 'object' && payload.params !== null && !Array.isArray(payload.params)
          ? (payload.params as Record<string, unknown>)
          : undefined;

      const details = payload ? payload.details : undefined;

      let message: string | string[] | undefined;
      if (typeof response === 'string') {
        message = response;
      } else if (payload && typeof payload.message === 'string') {
        message = payload.message;
      } else if (payload && Array.isArray(payload.message)) {
        message = payload.message.filter((item) => typeof item === 'string');
      } else {
        message = exception.message;
      }

      if (Array.isArray(message)) {
        message = message.join(', ');
      }

      return {
        code,
        message: message || exception.message,
        params,
        details,
      };
    }

    if (exception instanceof Error && !isProduction) {
      return { code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: exception.message };
    }

    return {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
    };
  }
}
