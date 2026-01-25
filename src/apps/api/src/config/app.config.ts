import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfigWithSubstitution } from './config.loader';

const YAML_CONFIG_FILENAME = 'config.yaml';

function loadConfigFile(): Record<string, unknown> {
  const envPath = process.env.CONFIG_PATH;

  const candidatePaths = [
    envPath,
    resolve(process.cwd(), YAML_CONFIG_FILENAME),
    resolve(__dirname, '../../config.yaml'),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  const configPath = candidatePaths.find((candidate) => existsSync(candidate));
  if (!configPath) {
    throw new Error(
      `Failed to locate config.yaml. Checked: ${candidatePaths.join(', ')}`,
    );
  }

  return loadConfigWithSubstitution(configPath);
}

export default loadConfigFile;
