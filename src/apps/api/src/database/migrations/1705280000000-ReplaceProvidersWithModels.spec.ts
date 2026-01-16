import { ReplaceProvidersWithModels1705280000000 } from './1705280000000-ReplaceProvidersWithModels';

describe('ReplaceProvidersWithModels1705280000000', () => {
  it('runs up migration queries', async () => {
    const migration = new ReplaceProvidersWithModels1705280000000();
    const queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryRunner as any);

    const queries = queryRunner.query.mock.calls.map(([sql]) => String(sql)).join(' ');
    expect(queries).toContain('CREATE TABLE "models"');
    expect(queries).toContain('ALTER TABLE "projects"');
    expect(queries).toContain('DROP TABLE IF EXISTS "providers"');
    expect(queries).toContain('DROP TABLE IF EXISTS "llm_providers"');
  });

  it('runs down migration queries', async () => {
    const migration = new ReplaceProvidersWithModels1705280000000();
    const queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryRunner as any);

    const queries = queryRunner.query.mock.calls.map(([sql]) => String(sql)).join(' ');
    expect(queries).toContain('CREATE TABLE "providers"');
    expect(queries).toContain('CREATE TABLE "llm_providers"');
    expect(queries).toContain('DROP TABLE IF EXISTS "models"');
  });
});
