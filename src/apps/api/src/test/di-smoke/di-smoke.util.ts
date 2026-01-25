import { Global, Module, type Provider } from '@nestjs/common';
import type { ModuleMetadata } from '@nestjs/common/interfaces';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

export type DiSmokeProviderOverride = {
  token: unknown;
  useValue: unknown;
};

export async function compileDiSmokeTestingModule(options: {
  imports: NonNullable<ModuleMetadata['imports']>;
  providers?: Provider[];
  overrides?: DiSmokeProviderOverride[];
}): Promise<TestingModule> {
  const builder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => ({})],
      }),
      DiSmokeDataSourceModule,
      ...options.imports,
    ],
    providers: options.providers ?? [],
  });

  for (const override of options.overrides ?? []) {
    builder.overrideProvider(override.token).useValue(override.useValue);
  }

  return builder.compile();
}

function createDataSourceStubProvider(): Provider {
  return {
    provide: getDataSourceToken(),
    useValue: {
      entityMetadatas: [],
      options: { type: 'postgres' },
      getRepository: jest.fn().mockReturnValue({}),
      getTreeRepository: jest.fn().mockReturnValue({}),
      getMongoRepository: jest.fn().mockReturnValue({}),
    },
  };
}

@Global()
@Module({
  providers: [createDataSourceStubProvider()],
  exports: [getDataSourceToken()],
})
class DiSmokeDataSourceModule {}
