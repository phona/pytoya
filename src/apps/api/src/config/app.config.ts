import { resolve } from 'node:path';
import { loadConfigWithSubstitution } from './config.loader';

const YAML_CONFIG_FILENAME = 'config.yaml';
const DEFAULT_CONFIG_PATH = resolve(__dirname, '../../config.yaml');

function loadConfigFile(): Record<string, unknown> {
  const rawPath = process.env.CONFIG_PATH || DEFAULT_CONFIG_PATH;
  const configPath =
    rawPath === YAML_CONFIG_FILENAME
      ? resolve(process.cwd(), rawPath)
      : rawPath;
  return loadConfigWithSubstitution(configPath);
}

export default loadConfigFile;
