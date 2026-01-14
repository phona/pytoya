import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WebSocketJwtGuard } from './websocket-jwt.guard';

type TestContext = {
  context: {
    switchToWs: () => {
      getClient: () => {
        handshake: {
          auth?: Record<string, unknown>;
          query?: Record<string, unknown>;
          headers?: Record<string, unknown>;
        };
        data: Record<string, unknown>;
      };
    };
  };
  client: {
    handshake: {
      auth?: Record<string, unknown>;
      query?: Record<string, unknown>;
      headers?: Record<string, unknown>;
    };
    data: Record<string, unknown>;
  };
};

const createContext = (token?: string): TestContext => {
  const client = {
    handshake: {
      auth: token ? { token } : {},
      query: {},
      headers: {},
    },
    data: {},
  };

  return {
    client,
    context: {
      switchToWs: () => ({
        getClient: () => client,
      }),
    },
  };
};

describe('WebSocketJwtGuard', () => {
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let guard: WebSocketJwtGuard;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    configService = {
      getOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    guard = new WebSocketJwtGuard(jwtService, configService);
  });

  it('rejects missing auth token', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('fails when JWT secret is missing', async () => {
    const { context } = createContext('token');
    configService.getOrThrow.mockImplementation(() => {
      throw new Error('JWT_SECRET is required');
    });

    await expect(guard.canActivate(context as any)).rejects.toThrow(
      'JWT_SECRET is required',
    );
  });

  it('attaches user payload when token is valid', async () => {
    const { context, client } = createContext('token');
    configService.getOrThrow.mockReturnValue('secret');
    jwtService.verifyAsync.mockResolvedValue({ userId: 123, role: 'user' });

    const result = await guard.canActivate(context as any);

    expect(result).toBe(true);
    expect(client.data.user).toEqual({ userId: 123, role: 'user' });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('token', {
      secret: 'secret',
    });
  });
});
