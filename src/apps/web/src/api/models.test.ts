import { http, HttpResponse } from 'msw';
import { modelsApi } from './models';
import { server } from '@/tests/mocks/server';

type ModelRequestBody = {
  name?: string;
  adapterType?: string;
  description?: string | null;
  parameters?: Record<string, unknown>;
};

describe('modelsApi', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('lists models with query params', async () => {
    const responseData = [
      {
        id: 'model-1',
        name: 'PaddleX OCR',
        adapterType: 'paddlex',
        description: null,
        category: 'ocr',
        parameters: { baseUrl: 'http://localhost:8080' },
        isActive: true,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ];

    server.use(
      http.get('/api/models', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('category')).toBe('ocr');
        return HttpResponse.json(responseData);
      }),
    );

    const result = await modelsApi.listModels({ category: 'ocr' });
    expect(result).toEqual(responseData);
  });

  it('fetches adapter schemas', async () => {
    const adapters = [
      {
        type: 'paddlex',
        name: 'PaddleX OCR',
        description: 'PaddleOCR service',
        category: 'ocr',
        parameters: {},
        capabilities: ['ocr'],
      },
    ];

    server.use(
      http.get('/api/models/adapters', () => HttpResponse.json(adapters)),
    );

    const result = await modelsApi.getAdapters();
    expect(result).toEqual(adapters);
  });

  it('creates a model', async () => {
    let received: ModelRequestBody = {};

    server.use(
      http.post('/api/models', async ({ request }) => {
        received = (await request.json()) as ModelRequestBody;
        return HttpResponse.json({
          id: 'model-2',
          name: received.name,
          adapterType: received.adapterType,
          description: received.description ?? null,
          category: 'ocr',
          parameters: received.parameters,
          isActive: true,
          createdAt: '2025-01-13T00:00:00.000Z',
          updatedAt: '2025-01-13T00:00:00.000Z',
        });
      }),
    );

    const result = await modelsApi.createModel({
      name: 'PaddleX OCR',
      adapterType: 'paddlex',
      parameters: { baseUrl: 'http://localhost:8080' },
    });

    expect(received).toMatchObject({
      name: 'PaddleX OCR',
      adapterType: 'paddlex',
    });
    expect(result.id).toBe('model-2');
  });

  it('updates a model', async () => {
    let received: ModelRequestBody = {};

    server.use(
      http.patch('/api/models/model-3', async ({ request }) => {
        received = (await request.json()) as ModelRequestBody;
        return HttpResponse.json({
          id: 'model-3',
          name: 'Updated',
          adapterType: 'openai',
          description: null,
          category: 'llm',
          parameters: received.parameters ?? {},
          isActive: true,
          createdAt: '2025-01-13T00:00:00.000Z',
          updatedAt: '2025-01-13T00:00:00.000Z',
        });
      }),
    );

    const result = await modelsApi.updateModel('model-3', {
      parameters: { temperature: 0.2 },
    });

    expect(received).toEqual({ parameters: { temperature: 0.2 } });
    expect(result.id).toBe('model-3');
  });

  it('deletes a model', async () => {
    let called = false;
    server.use(
      http.delete('/api/models/model-4', () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await modelsApi.deleteModel('model-4');
    expect(called).toBe(true);
  });

  it('tests model connection', async () => {
    server.use(
      http.post('/api/models/model-5/test', () =>
        HttpResponse.json({ ok: true, message: 'ok' }),
      ),
    );

    const result = await modelsApi.testConnection('model-5');
    expect(result.ok).toBe(true);
  });
});




