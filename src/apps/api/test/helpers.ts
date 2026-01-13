import { TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

/**
 * Create a test module with database mocked
 */
export async function createTestModule(options: {
  imports?: any[];
  providers?: any[];
}) {
  const { Test } = await import('@nestjs/testing');
  const { AppModule } = await import('../src/app.module');

  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
        ...(options.imports || []),
      ],
    providers: options.providers || [],
  });
}

/**
 * Mock repository with common methods
 */
export function createMockRepository() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

/**
 * Mock TypeORM connection
 */
export function mockDataSource() {
  return {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        query: jest.fn(),
      },
    }),
    destroy: jest.fn(),
  };
}
