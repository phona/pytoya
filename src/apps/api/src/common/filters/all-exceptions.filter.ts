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

type RequestWithId = Request & { id?: string };

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

    const { message, code } = this.buildError(
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
        requestId,
        timestamp: new Date().toISOString(),
        path,
      },
    });
  }

  private buildError(
    exception: unknown,
    isProduction: boolean,
  ): { message: string; code: string } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      let message =
        typeof response === 'string'
          ? response
          : (response as { message?: string | string[] }).message ??
            exception.message;

      if (Array.isArray(message)) {
        message = message.join(', ');
      }

      return {
        code: exception.name,
        message: message || exception.message,
      };
    }

    if (exception instanceof Error && !isProduction) {
      return { code: 'INTERNAL_SERVER_ERROR', message: exception.message };
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    };
  }
}
