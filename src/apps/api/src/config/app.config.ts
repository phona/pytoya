import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'js-yaml';
import merge from 'lodash.merge';

const YAML_CONFIG_FILENAME = 'config.yaml';

const DEFAULT_CONFIG = {
  server: {
    port: 3000,
    logLevel: 'info',
  },
  database: {
    host: 'localhost',
    port: 5432,
    username: 'pytoya_user',
    password: 'pytoya_pass',
    database: 'pytoya',
  },
  redis: {
    host: 'localhost',
    port: 6379,
  },
  jwt: {
    secret: 'change-me-secret',
    expiration: '7d',
  },
  paddleocr: {
    baseUrl: 'http://localhost:8080',
  },
  llm: {
    apiKey: '',
  },
} as const;

export type AppConfig = Readonly<typeof DEFAULT_CONFIG>;

function loadConfigFile(): Record<string, unknown> {
  // Allow overriding config path via CONFIG_PATH environment variable
  const configPath = process.env.CONFIG_PATH || join(process.cwd(), YAML_CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    // Return default config if file doesn't exist
    return { ...DEFAULT_CONFIG };
  }

  try {
    const yamlContent = readFileSync(configPath, 'utf8');
    const userConfig = yaml.load(yamlContent) as Record<string, unknown>;

    // Merge user config with defaults (user config takes precedence)
    return merge({}, DEFAULT_CONFIG, userConfig);
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export default loadConfigFile;
export { DEFAULT_CONFIG };
