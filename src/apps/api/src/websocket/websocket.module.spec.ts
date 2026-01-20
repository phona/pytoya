import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { WebSocketModule } from './websocket.module';

describe('WebSocketModule', () => {
  it('compiles with required infrastructure modules', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
            load: [() => ({ jwt: { secret: 'test-secret' } })],
          }),
          JwtModule.register({ secret: 'test-secret' }),
          WebSocketModule,
        ],
      }).compile(),
    ).resolves.toBeDefined();
  });
});
