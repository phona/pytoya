import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '@/tests/mocks/server';

export const setupMswForJourneyTests = () => {
  beforeAll(() => {
    server.listen({
      onUnhandledRequest(request) {
        throw new Error(`[MSW] Unhandled request: ${request.method} ${request.url}`);
      },
    });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });
};
