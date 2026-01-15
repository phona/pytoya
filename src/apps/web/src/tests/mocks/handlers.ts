import { http, HttpResponse } from 'msw';

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
        defaultProviderId: null,
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
      defaultProviderId: null,
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
    return HttpResponse.json([
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
    ]);
  }),

  // Providers endpoints
  http.get('/api/providers', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Provider',
        type: 'OPENAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-***',
        modelName: 'gpt-4',
        temperature: 0.7,
        maxTokens: 4096,
        isActive: true,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ]);
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
