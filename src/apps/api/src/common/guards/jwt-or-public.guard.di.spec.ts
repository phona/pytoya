import { Global, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { ManifestsModule } from '../../manifests/manifests.module';
import { QueueService } from '../../queue/queue.service';
import { UsersModule } from '../../users/users.module';
import { LlmService } from '../../llm/llm.service';
import { OcrService } from '../../ocr/ocr.service';
import { JwtOrPublicGuard } from './jwt-or-public.guard';

@Global()
@Module({
  providers: [
    {
      provide: getDataSourceToken(),
      useValue: {
        entityMetadatas: [],
        options: { type: 'postgres' },
        getRepository: jest.fn().mockReturnValue({}),
        getTreeRepository: jest.fn().mockReturnValue({}),
        getMongoRepository: jest.fn().mockReturnValue({}),
      },
    },
  ],
  exports: [getDataSourceToken()],
})
class TestDataSourceModule {}

@Global()
@Module({
  providers: [
    {
      provide: QueueService,
      useValue: { addExtractionJob: jest.fn() },
    },
  ],
  exports: [QueueService],
})
class TestQueueModule {}

@Global()
@Module({
  providers: [
    { provide: LlmService, useValue: { createChatCompletion: jest.fn() } },
    { provide: OcrService, useValue: { processPdf: jest.fn() } },
    {
      provide: 'IFileAccessService',
      useValue: {
        readFile: jest.fn(),
        getFileStats: jest.fn(),
        fileExists: jest.fn(),
        ensureDirectory: jest.fn(),
        writeFile: jest.fn(),
        moveFile: jest.fn(),
        deleteFile: jest.fn(),
      },
    },
  ],
  exports: [LlmService, OcrService, 'IFileAccessService'],
})
class TestModelDepsModule {}

@Global()
@Module({
  providers: [
    {
      provide: CACHE_MANAGER,
      useValue: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        store: { keys: jest.fn().mockResolvedValue([]) },
      },
    },
  ],
  exports: [CACHE_MANAGER],
})
class TestCacheModule {}

describe('JwtOrPublicGuard DI', () => {
  it('resolves guard when manifests repository is exported', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ jwt: { secret: 'test-secret', expiration: '7d' } })],
        }),
        TestDataSourceModule,
        TestQueueModule,
        TestModelDepsModule,
        TestCacheModule,
        UsersModule,
        ManifestsModule,
      ],
      providers: [
        JwtOrPublicGuard,
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
      ],
    }).compile();

    expect(moduleRef.get(JwtOrPublicGuard)).toBeDefined();
  });
});
