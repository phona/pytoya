import { describe, expect, it } from 'vitest';
import { screen, render, waitFor } from '@testing-library/react';
import { I18nProvider, useI18n } from './I18nProvider';

const LOCALE_STORAGE_KEY = 'pytoya-locale';

const setNavigatorLanguage = (value: string, languages?: string[]) => {
  Object.defineProperty(window.navigator, 'language', {
    value,
    configurable: true,
  });
  Object.defineProperty(window.navigator, 'languages', {
    value: languages ?? [value],
    configurable: true,
  });
};

function Consumer() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div>
      <div data-testid="locale">{locale}</div>
      <div data-testid="projects">{t('nav.projects')}</div>
      <div data-testid="missing">{t('missing.key')}</div>
      <button type="button" onClick={() => setLocale('zh-CN')}>
        set-zh
      </button>
    </div>
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    window.localStorage.removeItem(LOCALE_STORAGE_KEY);
    document.documentElement.lang = '';
    setNavigatorLanguage('en-US', ['en-US']);
  });

  it('uses browser language when no stored locale', async () => {
    setNavigatorLanguage('en-US', ['zh-CN', 'en-US']);

    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('locale')).toHaveTextContent('zh-CN'),
    );
    expect(screen.getByTestId('projects')).toHaveTextContent('项目');
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('prefers stored locale over browser language', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    setNavigatorLanguage('en-US', ['zh-CN', 'en-US']);

    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('locale')).toHaveTextContent('en'),
    );
    expect(screen.getByTestId('projects')).toHaveTextContent('Projects');
    expect(document.documentElement.lang).toBe('en');
  });

  it('persists locale changes and updates document lang', async () => {
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('locale')).toHaveTextContent('en'),
    );

    screen.getByRole('button', { name: 'set-zh' }).click();

    await waitFor(() =>
      expect(screen.getByTestId('locale')).toHaveTextContent('zh-CN'),
    );
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-CN');
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('returns a noisy placeholder for missing keys outside production', async () => {
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('locale')).toHaveTextContent('en'),
    );
    expect(screen.getByTestId('missing')).toHaveTextContent('__MISSING:missing.key__');
  });
});
