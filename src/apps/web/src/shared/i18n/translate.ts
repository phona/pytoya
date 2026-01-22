import { DEFAULT_LOCALE, type Locale, messagesByLocale } from './messages';

export type TranslateVars = Record<string, unknown>;

export const isMissingTranslation = (value: string) =>
  value.startsWith('__MISSING:') && value.endsWith('__');

const interpolate = (template: string, vars?: TranslateVars): string => {
  if (!vars) {
    return template;
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? '' : String(value);
  });
};

export const translate = (
  locale: Locale,
  key: string,
  vars?: TranslateVars,
): string => {
  const message =
    messagesByLocale[locale]?.[key] ?? messagesByLocale[DEFAULT_LOCALE]?.[key];

  if (!message) {
    const missing = `__MISSING:${key}__`;
    // Prefer noisy missing keys outside production.
    if (import.meta.env.MODE !== 'production') {
      return missing;
    }
    return key;
  }

  return interpolate(message, vars);
};

