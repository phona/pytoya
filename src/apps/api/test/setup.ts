// Global test setup for API tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRATION = '1h';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_DATABASE = 'pytoya_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

const originalError = console.error;
const originalStderrWrite = process.stderr.write.bind(process.stderr);
const ignoredErrorPatterns = [
  '[ExtractionService]',
  'Extraction workflow failed',
  '[ScriptExecutorService]',
  'Script execution failed',
  '[ValidationService]',
  'Cannot validate manifest that has not completed extraction',
];

const shouldIgnoreError = (args: unknown[]) =>
  args.some((arg) => {
    if (typeof arg === 'string') {
      return ignoredErrorPatterns.some((pattern) => arg.includes(pattern));
    }
    if (arg instanceof Error) {
      return ignoredErrorPatterns.some((pattern) => arg.message.includes(pattern));
    }
    return false;
  });

const shouldIgnoreStderr = (chunk: unknown) => {
  const text = typeof chunk === 'string' ? chunk : Buffer.isBuffer(chunk) ? chunk.toString('utf8') : '';
  return ignoredErrorPatterns.some((pattern) => text.includes(pattern));
};

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (shouldIgnoreError(args)) {
      return;
    }
    originalError(...args);
  };
  process.stderr.write = ((chunk: unknown, encoding?: BufferEncoding, callback?: (err?: Error) => void) => {
    if (shouldIgnoreStderr(chunk)) {
      if (typeof callback === 'function') {
        callback();
      }
      return true;
    }
    return originalStderrWrite(chunk as never, encoding as never, callback as never);
  }) as typeof process.stderr.write;
});

afterAll(() => {
  console.error = originalError;
  process.stderr.write = originalStderrWrite;
});
