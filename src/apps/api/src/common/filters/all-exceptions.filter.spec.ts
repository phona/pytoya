import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './all-exceptions.filter';

const createHost = (request: any, response: any) => ({
  switchToHttp: () => ({
    getRequest: () => request,
    getResponse: () => response,
  }),
});

describe('AllExceptionsFilter', () => {
  it('returns HttpException message and request id', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const request = {
      id: 'req-1',
      headers: {},
      originalUrl: '/api/test',
    };
    const filter = new AllExceptionsFilter();
    const exception = new HttpException('Invalid input', HttpStatus.BAD_REQUEST);

    filter.catch(exception, createHost(request, response) as any);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Invalid input',
          requestId: 'req-1',
          path: '/api/test',
        }),
      }),
    );
  });

  it('prefers application error code from exception response', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const request = {
      id: 'req-3',
      headers: {},
      originalUrl: '/api/projects/123',
    };
    const filter = new AllExceptionsFilter();
    const exception = new HttpException(
      {
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
        params: { projectId: 123 },
      },
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, createHost(request, response) as any);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
          params: { projectId: 123 },
          requestId: 'req-3',
          path: '/api/projects/123',
        }),
      }),
    );
  });

  it('sanitizes unknown errors in production', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const request = {
      headers: { 'x-request-id': 'req-2' },
      originalUrl: '/api/boom',
    };
    const configService = {
      get: jest.fn().mockReturnValue('production'),
    } as unknown as ConfigService;
    const filter = new AllExceptionsFilter(configService);

    filter.catch(new Error('Sensitive failure'), createHost(request, response) as any);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'An unexpected error occurred',
          requestId: 'req-2',
        }),
      }),
    );
  });
});
