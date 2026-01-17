import { resolve } from 'node:path';
import { loadConfigWithSubstitution } from './config.loader';

const YAML_CONFIG_FILENAME = 'config.yaml';

function loadConfigFile(): Record<string, unknown> {
  const rawPath = process.env.CONFIG_PATH || YAML_CONFIG_FILENAME;
  const configPath = resolve(process.cwd(), rawPath);
  return loadConfigWithSubstitution(configPath);
}

export default loadConfigFile;
