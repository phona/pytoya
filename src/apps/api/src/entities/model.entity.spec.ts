import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { ModelEntity } from './model.entity';

describe('ModelEntity metadata', () => {
  it('builds metadata with postgres without unsupported Object types', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'test',
      password: 'test',
      database: 'test',
      entities: [ModelEntity],
      synchronize: false,
      logging: false,
    });

    await expect(
      (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas(),
    ).resolves.toBeUndefined();
  });

  it('declares parameters as a jsonb column', () => {
    const column = getMetadataArgsStorage().columns.find(
      (item) => item.target === ModelEntity && item.propertyName === 'parameters',
    );

    expect(column?.options.type).toBe('jsonb');
  });
});
