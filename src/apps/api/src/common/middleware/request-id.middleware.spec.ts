import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  it('uses provided request id header', () => {
    const middleware = new RequestIdMiddleware();
    const req = {
      headers: { 'x-request-id': 'req-123' },
      method: 'GET',
      originalUrl: '/test',
    } as any;
    const res = { setHeader: jest.fn() } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).toBe('req-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'req-123');
    expect(next).toHaveBeenCalled();
  });
});
