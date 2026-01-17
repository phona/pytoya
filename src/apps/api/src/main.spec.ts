import { buildCorsOptions } from './main';

describe('buildCorsOptions', () => {
  it('returns null when disabled', () => {
    const options = buildCorsOptions({ enabled: false });
    expect(options).toBeNull();
  });

  it('allows listed origins and blocks others', () => {
    const options = buildCorsOptions({
      enabled: true,
      allowedOrigins: ['http://allowed.local'],
      credentials: true,
    });

    expect(options).not.toBeNull();
    const origin = options?.origin as (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => void;

    const callback = jest.fn();
    origin('http://allowed.local', callback);
    expect(callback).toHaveBeenCalledWith(null, true);

    const deniedCallback = jest.fn();
    origin('http://denied.local', deniedCallback);
    expect(deniedCallback).toHaveBeenCalledWith(expect.any(Error), false);
  });

  it('allows requests with no origin', () => {
    const options = buildCorsOptions({
      enabled: true,
      allowedOrigins: [],
    });

    const origin = options?.origin as (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => void;

    const callback = jest.fn();
    origin(undefined, callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });
});
