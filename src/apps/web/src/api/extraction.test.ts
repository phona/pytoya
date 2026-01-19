import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { extractionApi } from './extraction';
import { server } from '../tests/mocks/server';
import { http, HttpResponse } from 'msw';

describe('extractionApi', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('optimizePrompt', () => {
    it('should send optimization request and return response', async () => {
      const result = await extractionApi.optimizePrompt({
        description: 'Extract invoice data',
      });

      expect(result).toEqual({ prompt: 'Optimized: Extract invoice data' });
    });

    it('should handle API errors gracefully', async () => {
      server.use(
        http.post('/api/extraction/optimize-prompt', () => {
          return HttpResponse.json({ message: 'Server error' }, { status: 500 });
        })
      );

      await expect(
        extractionApi.optimizePrompt({ description: 'test' })
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      server.use(
        http.post('/api/extraction/optimize-prompt', () => {
          return HttpResponse.error();
        })
      );

      await expect(
        extractionApi.optimizePrompt({ description: 'test' })
      ).rejects.toThrow();
    });
  });
});
