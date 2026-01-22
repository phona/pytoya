import { describe, expect, it } from 'vitest';
import { getApiErrorText } from './client';
import { translate } from '@/shared/i18n/translate';

const t = (key: string, vars?: Record<string, unknown>) => translate('en', key, vars);

describe('getApiErrorText', () => {
  it('maps error.code to a translation key and includes requestId', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'PROJECT_NOT_FOUND',
            requestId: 'req-123',
          },
        },
      },
    };

    expect(getApiErrorText(error as any, t)).toBe(
      'Project not found (Request ID: req-123)',
    );
  });

  it('falls back to backend message for unknown codes', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'SOME_NEW_CODE',
            message: 'Backend message',
            requestId: 'req-456',
          },
        },
      },
    };

    expect(getApiErrorText(error as any, t)).toBe(
      'Backend message (Request ID: req-456)',
    );
  });
});

