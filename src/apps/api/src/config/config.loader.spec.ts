import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfigWithSubstitution } from './config.loader';

const writeTempConfig = (contents: string): { dir: string; path: string } => {
  const dir = mkdtempSync(join(tmpdir(), 'pytoya-config-'));
  const filePath = join(dir, 'config.yaml');
  writeFileSync(filePath, contents);
  return { dir, path: filePath };
};

describe('loadConfigWithSubstitution', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('substitutes required and default variables', () => {
    const { dir, path } = writeTempConfig(`
server:
  port: {{default SERVER_PORT "3000"}}
database:
  password: {{DB_PASSWORD}}
`);

    process.env.DB_PASSWORD = 'secret';
    delete process.env.SERVER_PORT;

    const result = loadConfigWithSubstitution(path);
    expect(result).toMatchObject({
      server: { port: 3000 },
      database: { password: 'secret' },
    });

    rmSync(dir, { recursive: true, force: true });
  });

  it('throws when required variables are missing', () => {
    const { dir, path } = writeTempConfig(`
database:
  password: {{DB_PASSWORD}}
`);

    delete process.env.DB_PASSWORD;

    expect(() => loadConfigWithSubstitution(path)).toThrow(
      /Required environment variable\(s\) missing: DB_PASSWORD/,
    );

    rmSync(dir, { recursive: true, force: true });
  });
});
