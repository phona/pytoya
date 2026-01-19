// test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Note: msw/node may require specific Jest configuration for ESM
// If import fails, ensure transformIgnorePatterns includes msw
export const server = setupServer(...handlers);




