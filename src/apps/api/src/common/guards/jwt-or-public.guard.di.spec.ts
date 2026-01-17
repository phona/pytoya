import { Global, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { ManifestsModule } from '../../manifests/manifests.module';
import { QueueService } from '../../queue/queue.service';
import { UsersModule } from '../../users/users.module';
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

describe('JwtOrPublicGuard DI', () => {
  it('resolves guard when manifests repository is exported', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestDataSourceModule, TestQueueModule, UsersModule, ManifestsModule],
      providers: [
        JwtOrPublicGuard,
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
      ],
    }).compile();

    expect(moduleRef.get(JwtOrPublicGuard)).toBeDefined();
  });
});
