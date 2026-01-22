/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@/shared/i18n/messages';
import { translate, type TranslateVars } from '@/shared/i18n/translate';

export type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: TranslateVars) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

const LOCALE_STORAGE_KEY = 'pytoya-locale';

const normalizeLocale = (value: string | null | undefined): Locale | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === 'en' || trimmed.toLowerCase().startsWith('en-')) return 'en';
  if (trimmed === 'zh-CN') return 'zh-CN';
  if (trimmed.toLowerCase().startsWith('zh')) return 'zh-CN';
  return null;
};

const isSupportedLocale = (value: string): value is Locale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(value);

const getStoredLocale = (): Locale | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const normalized = normalizeLocale(value);
    return normalized && isSupportedLocale(normalized) ? normalized : null;
  } catch {
    return null;
  }
};

const getBrowserLocale = (): Locale | null => {
  if (typeof navigator === 'undefined') {
    return null;
  }
  const candidates =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    if (normalized && isSupportedLocale(normalized)) {
      return normalized;
    }
  }

  return null;
};

const persistLocale = (locale: Locale) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage errors (private mode, blocked storage).
  }
};

const applyLocaleToDocument = (locale: Locale) => {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.lang = locale;
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const storedLocale = getStoredLocale();
    const initialLocale = storedLocale ?? getBrowserLocale() ?? DEFAULT_LOCALE;
    setLocaleState(initialLocale);
    applyLocaleToDocument(initialLocale);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    persistLocale(nextLocale);
    applyLocaleToDocument(nextLocale);
  }, []);

  const t = useCallback(
    (key: string, vars?: TranslateVars) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
