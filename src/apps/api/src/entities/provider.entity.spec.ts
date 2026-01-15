import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { ProviderEntity } from './provider.entity';

describe('ProviderEntity metadata', () => {
  it('builds metadata with postgres without unsupported Object types', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'test',
      password: 'test',
      database: 'test',
      entities: [ProviderEntity],
      synchronize: false,
      logging: false,
    });

    await expect(
      (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas(),
    ).resolves.toBeUndefined();
  });

  it('declares modelName as a varchar column', () => {
    const column = getMetadataArgsStorage().columns.find(
      (item) => item.target === ProviderEntity && item.propertyName === 'modelName',
    );

    expect(column?.options.type).toBe('varchar');
  });
});
