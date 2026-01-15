// test/setup.ts
import '@testing-library/jest-dom/vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for TextEncoder/TextDecoder in jsdom
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Suppress console errors in tests (unless debugging)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock environment variables
import.meta.env.VITE_API_URL = 'http://localhost:3000/api';
