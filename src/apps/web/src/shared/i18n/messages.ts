import { enMessages } from './locales/en';
import { zhCNMessages } from './locales/zh-CN';

export type Locale = 'en' | 'zh-CN';

export const DEFAULT_LOCALE: Locale = 'en';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'zh-CN'] as const;

export const messagesByLocale: Record<Locale, Record<string, string>> = {
  en: enMessages,
  'zh-CN': zhCNMessages,
};

