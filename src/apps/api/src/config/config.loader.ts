import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as yaml from 'js-yaml';
import Handlebars from 'handlebars';

const REQUIRED_ENV_REGEX = /{{\s*([A-Z0-9_]+)\s*}}/g;

const registerHelpers = () => {
  if (Object.prototype.hasOwnProperty.call(Handlebars.helpers, 'default')) {
    return;
  }
  Handlebars.registerHelper('default', (value: unknown, fallback: unknown) => {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    return value;
  });
};

const extractRequiredEnvVars = (template: string): string[] => {
  const matches = template.matchAll(REQUIRED_ENV_REGEX);
  const vars = new Set<string>();
  for (const match of matches) {
    vars.add(match[1]);
  }
  return Array.from(vars);
};

const findMissingEnvVars = (template: string): string[] => {
  const required = extractRequiredEnvVars(template);
  return required.filter((name) => {
    const value = process.env[name];
    return value === undefined || value === null || value === '';
  });
};

export const loadConfigWithSubstitution = (
  configPath: string,
): Record<string, unknown> => {
  const resolvedPath = resolve(process.cwd(), configPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(
      `ConfigurationError: Config file not found at ${resolvedPath}`,
    );
  }

  const template = readFileSync(resolvedPath, 'utf8');
  registerHelpers();

  const missing = findMissingEnvVars(template);
  if (missing.length > 0) {
    throw new Error(
      `ConfigurationError: Required environment variable(s) missing: ${missing.join(
        ', ',
      )}`,
    );
  }

  const compiled = Handlebars.compile(template, { noEscape: true });
  const rendered = compiled(process.env);

  try {
    const parsed = yaml.load(rendered);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Config file did not produce an object');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse config from ${resolvedPath}: ${message}`,
    );
  }
};
