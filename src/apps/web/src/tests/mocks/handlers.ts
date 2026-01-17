import { http, HttpResponse } from 'msw';

interface ModelRequestBody {
  name?: string;
  adapterType?: string;
  description?: string | null;
  parameters?: Record<string, unknown>;
  isActive?: boolean;
}

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      user: {
        id: 1,
        username: 'test-user',
        role: 'user',
      },
      token: 'mock-jwt-token',
    });
  }),

  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      user: {
        id: 1,
        username: 'test-user',
        role: 'user',
      },
      token: 'mock-jwt-token',
    });
  }),

  http.get('/api/auth/profile', () => {
    return HttpResponse.json({
      id: 1,
      username: 'test-user',
      role: 'user',
    });
  }),

  // Projects endpoints
  http.get('/api/projects', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Project',
        description: 'Test project description',
        userId: 1,
        ocrModelId: null,
        llmModelId: null,
        defaultPromptId: null,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
        _count: {
          groups: 2,
          manifests: 5,
        },
      },
    ]);
  }),

  http.get('/api/projects/:id', ({ params }) => {
    if (params.id === '999') {
      return HttpResponse.json({ message: 'Project not found' }, { status: 404 });
    }
    return HttpResponse.json({
      id: Number(params.id),
      name: 'Test Project',
      description: 'Test project description',
      userId: 1,
      ocrModelId: null,
      llmModelId: null,
      defaultPromptId: null,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
      _count: {
        groups: 2,
        manifests: 5,
      },
    });
  }),

  // Groups endpoints
  http.get('/api/projects/:projectId/groups', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Group',
        projectId: 1,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
        _count: {
          manifests: 3,
        },
      },
    ]);
  }),

  // Manifests endpoints
  http.get('/api/groups/:groupId/manifests', () => {
    return HttpResponse.json({
      data: [
        {
          id: 1,
          filename: 'manifest_0000001.pdf',
          originalFilename: 'test.pdf',
          storagePath: '/uploads/test.pdf',
          fileSize: 12345,
          status: 'completed',
          groupId: 1,
          extractedData: {
            invoice: {
              po_no: '0000001',
              invoice_date: '2025-01-13',
              department_code: 'PROD',
            },
          },
          confidence: 0.95,
          purchaseOrder: '0000001',
          invoiceDate: '2025-01-13',
          department: 'PROD',
          humanVerified: false,
          createdAt: '2025-01-13T00:00:00.000Z',
          updatedAt: '2025-01-13T00:00:00.000Z',
        },
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      },
    });
  }),

  // Schema templates endpoints
  http.get('/api/schemas/templates', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Invoice Template',
        jsonSchema: {
          type: 'object',
          properties: {
            invoice: {
              type: 'object',
              properties: {
                po_no: { type: 'string' },
                invoice_date: { type: 'string' },
              },
            },
            department: {
              type: 'object',
              properties: {
                code: { type: 'string' },
              },
            },
          },
        },
        requiredFields: [],
        projectId: 1,
        isTemplate: true,
        description: null,
        extractionStrategy: 'ocr-first',
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ]);
  }),

  // Models endpoints
  http.get('/api/models', () => {
    return HttpResponse.json([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Test LLM Model',
        adapterType: 'openai',
        description: null,
        category: 'llm',
        parameters: {
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '********',
          modelName: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 4096,
        },
        isActive: true,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ]);
  }),
  http.get('/api/models/adapters', () => {
    return HttpResponse.json([
      {
        type: 'openai',
        name: 'OpenAI-Compatible',
        description: 'OpenAI API compatible LLMs',
        category: 'llm',
        parameters: {
          baseUrl: { type: 'string', required: true, label: 'Base URL' },
          apiKey: { type: 'string', required: true, label: 'API Key', secret: true },
          modelName: { type: 'string', required: true, label: 'Model Name' },
        },
        capabilities: ['llm'],
      },
      {
        type: 'paddlex',
        name: 'PaddleX OCR',
        description: 'PaddleOCR-VL adapter',
        category: 'ocr',
        parameters: {
          baseUrl: { type: 'string', required: true, label: 'Base URL' },
        },
        capabilities: ['ocr'],
      },
    ]);
  }),
  http.post('/api/models', async ({ request }) => {
    const body = (await request.json()) as ModelRequestBody;
    return HttpResponse.json({
      id: '22222222-2222-2222-2222-222222222222',
      ...body,
      description: body.description ?? null,
      category: body.adapterType === 'paddlex' ? 'ocr' : 'llm',
      isActive: body.isActive ?? true,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),
  http.patch('/api/models/:id', async ({ request, params }) => {
    const body = (await request.json()) as ModelRequestBody;
    return HttpResponse.json({
      id: params.id,
      name: body.name ?? 'Updated Model',
      adapterType: body.adapterType ?? 'openai',
      description: body.description ?? null,
      category: (body.adapterType ?? 'openai') === 'paddlex' ? 'ocr' : 'llm',
      parameters: body.parameters ?? {},
      isActive: body.isActive ?? true,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),
  http.delete('/api/models/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.post('/api/models/:id/test', () => {
    return HttpResponse.json({ ok: true, message: 'ok' });
  }),

  // Prompts endpoints
  http.get('/api/prompts', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'System Prompt',
        type: 'system',
        content: 'Test prompt content with {{variable}}',
        variables: ['variable'],
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ]);
  }),
];
