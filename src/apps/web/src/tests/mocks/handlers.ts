import { http, HttpResponse } from 'msw';

interface ModelRequestBody {
  name?: string;
  adapterType?: string;
  description?: string | null;
  category?: string | null;
  parameters?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  pricingHistory?: unknown[];
  isActive?: boolean;
}

const parseJsonBody = async (request: Request) => {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const mockExtractors = [
  {
    id: 'extractor-1',
    name: 'Vision LLM - GPT-4o',
    description: 'OpenAI GPT-4o vision',
    extractorType: 'vision-llm',
    config: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '********',
      model: 'gpt-4o',
      pricing: {
        mode: 'token',
        currency: 'USD',
        inputPricePerMillionTokens: 2.5,
        outputPricePerMillionTokens: 10,
      },
    },
    isActive: true,
    usageCount: 2,
    createdAt: '2025-01-13T00:00:00.000Z',
    updatedAt: '2025-01-13T00:00:00.000Z',
  },
  {
    id: 'extractor-2',
    name: 'PaddleOCR VL',
    description: 'Layout-aware OCR',
    extractorType: 'paddleocr',
    config: {
      baseUrl: 'http://ocr.local',
      pricing: {
        mode: 'page',
        currency: 'USD',
        pricePerPage: 0.001,
      },
    },
    isActive: true,
    usageCount: 1,
    createdAt: '2025-01-13T00:00:00.000Z',
    updatedAt: '2025-01-13T00:00:00.000Z',
  },
];

const mockExtractorTypes = [
  {
    id: 'vision-llm',
    name: 'Vision LLM',
    description: 'OpenAI-compatible vision LLM',
    version: '1.0.0',
    category: 'vision',
    supportedFormats: ['pdf', 'image'],
    paramsSchema: {
      baseUrl: { type: 'string', required: true, label: 'Base URL' },
      apiKey: { type: 'string', required: true, label: 'API Key', secret: true },
      model: { type: 'string', required: true, label: 'Model' },
    },
    pricingSchema: {
      inputPricePerMillionTokens: {
        type: 'number',
        required: true,
        label: 'Input Price (per 1M tokens)',
      },
      outputPricePerMillionTokens: {
        type: 'number',
        required: true,
        label: 'Output Price (per 1M tokens)',
      },
    },
  },
  {
    id: 'paddleocr',
    name: 'PaddleOCR VL',
    description: 'Layout-aware OCR',
    version: '1.0.0',
    category: 'ocr',
    supportedFormats: ['pdf', 'image'],
    paramsSchema: {
      baseUrl: { type: 'string', required: true, label: 'Base URL' },
    },
    pricingSchema: {
      pricePerPage: { type: 'number', required: false, label: 'Price per Page' },
    },
  },
];

const mockExtractorPresets = [
  {
    id: 'preset-gpt-4o',
    name: 'GPT-4o Vision',
    description: 'OpenAI GPT-4o vision preset',
    extractorType: 'vision-llm',
    config: {
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
    },
  },
];

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
        textExtractorId: 'extractor-1',
        llmModelId: '11111111-1111-1111-1111-111111111111',
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
      textExtractorId: 'extractor-1',
      llmModelId: '11111111-1111-1111-1111-111111111111',
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
      _count: {
        groups: 2,
        manifests: 5,
      },
    });
  }),
  http.put('/api/projects/:id/extractor', async ({ request, params }) => {
    const body = await parseJsonBody(request);
    return HttpResponse.json({
      id: Number(params.id),
      name: 'Test Project',
      description: 'Test project description',
      userId: 1,
      textExtractorId: body.textExtractorId ?? 'extractor-1',
      llmModelId: '11111111-1111-1111-1111-111111111111',
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
      _count: {
        groups: 2,
        manifests: 5,
      },
    });
  }),
  http.get('/api/projects/:id/cost-summary', ({ params }) => {
    return HttpResponse.json({
      projectId: Number(params.id),
      totalExtractionCost: 0.25,
      costByExtractor: [
        {
          extractorId: 'extractor-1',
          extractorName: 'Vision LLM - GPT-4o',
          totalCost: 0.2,
          extractionCount: 4,
          averageCost: 0.05,
        },
      ],
      costOverTime: [{ date: '2025-01-13', extractionCost: 0.25 }],
    });
  }),
  http.get('/api/projects/:id/cost-by-date-range', ({ request, params }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? '2025-01-01';
    const to = url.searchParams.get('to') ?? '2025-01-13';
    return HttpResponse.json({
      projectId: Number(params.id),
      totalExtractionCost: 0.12,
      costByExtractor: [
        {
          extractorId: 'extractor-1',
          extractorName: 'Vision LLM - GPT-4o',
          totalCost: 0.12,
          extractionCount: 2,
          averageCost: 0.06,
        },
      ],
      costOverTime: [{ date: from, extractionCost: 0.12 }],
      dateRange: { from, to },
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
          fileType: 'pdf',
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
          validationResults: null,
          ocrResult: null,
          ocrProcessedAt: null,
          ocrQualityScore: null,
          extractionCost: null,
          textExtractorId: 'extractor-1',
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

  // Schema validation endpoints
  http.get('/api/schemas', () => {
    return HttpResponse.json([]);
  }),
  http.post('/api/schemas/validate', () => {
    return HttpResponse.json({ valid: true });
  }),
  http.post('/api/schemas/validate-with-required', () => {
    return HttpResponse.json({ valid: true });
  }),

  // Schema generation endpoints
  http.post('/api/schemas/generate', () => {
    return HttpResponse.json({
      jsonSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    });
  }),
  http.post('/api/schemas/generate-rules', () => {
    return HttpResponse.json({ rules: [] });
  }),
  http.post('/api/schemas/:id/generate-rules', () => {
    return HttpResponse.json({ rules: [] });
  }),
  http.post('/api/schemas/import', () => {
    return HttpResponse.json({
      valid: true,
      jsonSchema: { type: 'object', properties: {}, required: [] },
    });
  }),
  http.get('/api/schemas/:schemaId/rules', () => {
    return HttpResponse.json([]);
  }),
  http.post('/api/schemas/:schemaId/rules', async ({ request, params }) => {
    const body = await parseJsonBody(request);
    return HttpResponse.json({
      id: 1,
      schemaId: Number(params.schemaId),
      ...body,
      createdAt: '2025-01-13T00:00:00.000Z',
    });
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
        pricing: {
          effectiveDate: '2025-01-13T00:00:00.000Z',
          llm: { inputPrice: 0.15, outputPrice: 0.6, currency: 'USD' },
        },
        pricingHistory: [],
        isActive: true,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ]);
  }),
  // Extractors endpoints
  http.get('/api/extractors', ({ request }) => {
    const url = new URL(request.url);
    const extractorType = url.searchParams.get('extractorType');
    const isActive = url.searchParams.get('isActive');
    let results = [...mockExtractors];
    if (extractorType) {
      results = results.filter((extractor) => extractor.extractorType === extractorType);
    }
    if (isActive !== null && isActive !== undefined) {
      const active = isActive === 'true';
      results = results.filter((extractor) => extractor.isActive === active);
    }
    return HttpResponse.json(results);
  }),
  http.get('/api/extractors/types', () => {
    return HttpResponse.json(mockExtractorTypes);
  }),
  http.get('/api/extractors/presets', () => {
    return HttpResponse.json(mockExtractorPresets);
  }),
  http.post('/api/extractors', async ({ request }) => {
    const body = await parseJsonBody(request);
    return HttpResponse.json({
      id: 'extractor-new',
      name: body.name ?? 'New Extractor',
      description: body.description ?? null,
      extractorType: body.extractorType ?? 'vision-llm',
      config: body.config ?? {},
      isActive: body.isActive ?? true,
      usageCount: 0,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),
  http.patch('/api/extractors/:id', async ({ request, params }) => {
    const body = await parseJsonBody(request);
    return HttpResponse.json({
      id: params.id,
      name: body.name ?? 'Updated Extractor',
      description: body.description ?? null,
      extractorType: body.extractorType ?? 'vision-llm',
      config: body.config ?? {},
      isActive: body.isActive ?? true,
      usageCount: 0,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),
  http.delete('/api/extractors/:id', () => new HttpResponse(null, { status: 204 })),
  http.post('/api/extractors/:id/test', () => {
    return HttpResponse.json({ ok: true, message: 'ok' });
  }),
  http.get('/api/extractors/:id/cost-summary', ({ params }) => {
    return HttpResponse.json({
      extractorId: params.id,
      extractorName: 'Vision LLM - GPT-4o',
      totalExtractions: 3,
      totalCost: 0.12,
      averageCostPerExtraction: 0.04,
      currency: 'USD',
      costBreakdown: {
        byDate: [{ date: '2025-01-13', count: 3, cost: 0.12 }],
        byProject: [{ projectId: 1, projectName: 'Test Project', count: 3, cost: 0.12 }],
      },
    });
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
    const body = (await parseJsonBody(request)) as ModelRequestBody;
    const category = body.category ?? (body.adapterType === 'paddlex' ? 'ocr' : 'llm');
    const pricing = body.pricing ?? (category === 'ocr'
      ? { effectiveDate: '2025-01-13T00:00:00.000Z', ocr: { pricePerPage: 0.001, currency: 'USD' } }
      : { effectiveDate: '2025-01-13T00:00:00.000Z', llm: { inputPrice: 0.15, outputPrice: 0.6, currency: 'USD' } });
    return HttpResponse.json({
      id: '22222222-2222-2222-2222-222222222222',
      name: body.name ?? 'New Model',
      adapterType: body.adapterType ?? 'openai',
      description: body.description ?? null,
      category,
      parameters: body.parameters ?? {},
      pricing,
      pricingHistory: body.pricingHistory ?? [],
      isActive: body.isActive ?? true,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),
  http.patch('/api/models/:id', async ({ request, params }) => {
    const body = (await parseJsonBody(request)) as ModelRequestBody;
    const adapterType = body.adapterType ?? 'openai';
    const category = body.category ?? (adapterType === 'paddlex' ? 'ocr' : 'llm');
    const pricing = body.pricing ?? (category === 'ocr'
      ? { effectiveDate: '2025-01-13T00:00:00.000Z', ocr: { pricePerPage: 0.001, currency: 'USD' } }
      : { effectiveDate: '2025-01-13T00:00:00.000Z', llm: { inputPrice: 0.15, outputPrice: 0.6, currency: 'USD' } });
    return HttpResponse.json({
      id: params.id,
      name: body.name ?? 'Updated Model',
      adapterType,
      description: body.description ?? null,
      category,
      parameters: body.parameters ?? {},
      pricing,
      pricingHistory: body.pricingHistory ?? [],
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

  http.get('/api/prompts/:id', ({ params }) => {
    if (params.id === '999') {
      return HttpResponse.json({ message: 'Prompt not found' }, { status: 404 });
    }
    return HttpResponse.json({
      id: Number(params.id),
      name: 'Test Prompt',
      type: 'system',
      content: 'Test content {{field}}',
      variables: ['field'],
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  http.post('/api/prompts', async ({ request }) => {
    const body = await parseJsonBody(request);
    const type = typeof body.type === 'string' ? body.type : 'system';
    return HttpResponse.json({
      id: 2,
      name: typeof body.name === 'string' ? body.name : 'New Prompt',
      type,
      content: typeof body.content === 'string' ? body.content : 'New content',
      variables: Array.isArray(body.variables) ? body.variables : [],
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  http.patch('/api/prompts/:id', async ({ request, params }) => {
    const body = await parseJsonBody(request);
    return HttpResponse.json({
      id: Number(params.id),
      name: typeof body.name === 'string' ? body.name : 'Updated Prompt',
      type: 'system',
      content: typeof body.content === 'string' ? body.content : 'Updated content',
      variables: Array.isArray(body.variables) ? body.variables : [],
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  http.delete('/api/prompts/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Extraction endpoints
  http.post('/api/extraction/optimize-prompt', async ({ request }) => {
    const body = await parseJsonBody(request);
    const description = typeof body.description === 'string' ? body.description : '';
    return HttpResponse.json({
      prompt: `Optimized: ${description}`,
    });
  }),

  // Manifests export endpoints
  http.post('/api/groups/:groupId/manifests/export', () => {
    return HttpResponse.json(
      new Blob(['csv,data'], { type: 'text/csv' }),
      {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="export.csv"',
        },
      }
    );
  }),

  http.get('/api/manifests/export/csv', () => {
    return HttpResponse.json(
      new Blob(['csv,data'], { type: 'text/csv' }),
      {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="export.csv"',
        },
      }
    );
  }),

  http.post('/api/manifests/export/csv', () => {
    return HttpResponse.json(
      new Blob(['csv,data'], { type: 'text/csv' }),
      {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="export.csv"',
        },
      }
    );
  }),

  http.post('/api/manifests/export', () => {
    return HttpResponse.json(
      new Blob(['csv,data'], { type: 'text/csv' }),
      {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="export.csv"',
        },
      }
    );
  }),

  // Validation endpoints
  http.get('/api/validation-scripts', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Script',
        description: null,
        projectId: 1,
        script: 'return true;',
        severity: 'warning',
        enabled: true,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ]);
  }),

  http.get('/api/validation-scripts/:id', () => {
    return HttpResponse.json({
      id: 1,
      name: 'Test Script',
      description: null,
      projectId: 1,
      script: 'return true;',
      severity: 'warning',
      enabled: true,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  http.post('/api/validation-scripts', async ({ request }) => {
    const body = await parseJsonBody(request);
    const projectId = typeof body.projectId === 'number'
      ? body.projectId
      : Number(body.projectId ?? 1);
    return HttpResponse.json({
      id: 1,
      name: typeof body.name === 'string' ? body.name : 'Test Script',
      description: typeof body.description === 'string' ? body.description : null,
      projectId,
      script: typeof body.script === 'string' ? body.script : 'return true;',
      severity: typeof body.severity === 'string' ? body.severity : 'warning',
      enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  http.patch('/api/validation-scripts/:id', async ({ request, params }) => {
    const body = await parseJsonBody(request);
    const projectId = typeof body.projectId === 'number'
      ? body.projectId
      : body.projectId
      ? Number(body.projectId)
      : 1;
    return HttpResponse.json({
      id: Number(params.id),
      name: typeof body.name === 'string' ? body.name : 'Test Script',
      description: typeof body.description === 'string' ? body.description : null,
      projectId,
      script: typeof body.script === 'string' ? body.script : 'return true;',
      severity: typeof body.severity === 'string' ? body.severity : 'warning',
      enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  http.delete('/api/validation-scripts/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/validation-scripts/validate-syntax', () => {
    return HttpResponse.json({ valid: true });
  }),

  http.post('/api/validation-scripts/generate', () => {
    return HttpResponse.json({
      name: 'Generated Script',
      description: 'Generated validation script',
      severity: 'warning',
      script: 'return true;',
    });
  }),

  // Validation endpoints with correct path (slash instead of dash)
  http.get('/api/validation/scripts', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Script',
        description: null,
        projectId: 1,
        script: 'return true;',
        severity: 'warning',
        enabled: true,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ]);
  }),

  http.get('/api/validation/scripts/:id', () => {
    return HttpResponse.json({
      id: 1,
      name: 'Test Script',
      description: null,
      projectId: 1,
      script: 'return true;',
      severity: 'warning',
      enabled: true,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  http.get('/api/validation/scripts/project/:projectId', () => {
    return HttpResponse.json([]);
  }),

  http.post('/api/validation/scripts', async ({ request }) => {
    const body = await parseJsonBody(request);
    const projectId = typeof body.projectId === 'number'
      ? body.projectId
      : Number(body.projectId ?? 1);
    return HttpResponse.json({
      id: 1,
      name: typeof body.name === 'string' ? body.name : 'Test Script',
      description: typeof body.description === 'string' ? body.description : null,
      projectId,
      script: typeof body.script === 'string' ? body.script : 'return true;',
      severity: typeof body.severity === 'string' ? body.severity : 'warning',
      enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  // Specific routes must come before :id parameterized routes to avoid matching issues
  http.post('/api/validation/scripts/validate-syntax', () => {
    return HttpResponse.json({ valid: true });
  }),

  http.post('/api/validation/scripts/generate', () => {
    return HttpResponse.json({
      name: 'Generated Script',
      description: 'Generated validation script',
      severity: 'warning',
      script: 'return true;',
    });
  }),

  http.post('/api/validation/scripts/:id', async ({ request, params }) => {
    const body = await parseJsonBody(request);
    const projectId = typeof body.projectId === 'number'
      ? body.projectId
      : body.projectId
      ? Number(body.projectId)
      : 1;
    return HttpResponse.json({
      id: Number(params.id),
      name: typeof body.name === 'string' ? body.name : 'Test Script',
      description: typeof body.description === 'string' ? body.description : null,
      projectId,
      script: typeof body.script === 'string' ? body.script : 'return true;',
      severity: typeof body.severity === 'string' ? body.severity : 'warning',
      enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  http.delete('/api/validation/scripts/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/validation/run', () => {
    return HttpResponse.json({
      issues: [],
      errorCount: 0,
      warningCount: 0,
      validatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  http.post('/api/validation/batch', () => {
    return HttpResponse.json({
      1: {
        issues: [],
        errorCount: 0,
        warningCount: 1,
        validatedAt: '2025-01-13T00:00:00.000Z',
      },
      2: {
        issues: [],
        errorCount: 1,
        warningCount: 0,
        validatedAt: '2025-01-13T00:00:00.000Z',
      },
    });
  }),

  // Additional manifests endpoints for use-manifests tests
  http.get('/api/manifests/:id', () => {
    return HttpResponse.json({
      id: 1,
      filename: 'manifest_0000001.pdf',
      originalFilename: 'test.pdf',
      storagePath: '/uploads/test.pdf',
      fileSize: 12345,
      fileType: 'pdf',
      status: 'completed',
      groupId: 1,
      extractedData: { field: 'value' },
      confidence: 0.95,
      purchaseOrder: '0000001',
      invoiceDate: '2025-01-13',
      department: 'PROD',
      humanVerified: false,
      validationResults: null,
      ocrResult: null,
      ocrProcessedAt: null,
      ocrQualityScore: null,
      extractionCost: null,
      textExtractorId: 'extractor-1',
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  http.get('/api/manifests/:id/items', () => {
    return HttpResponse.json([
      {
        id: 1,
        manifestId: 1,
        fieldName: 'field',
        fieldValue: 'value',
        confidence: 0.95,
      },
    ]);
  }),

  http.patch('/api/manifests/:id', async ({ request, params }) => {
    const body = await parseJsonBody(request);
    return HttpResponse.json({
      id: Number(params.id),
      ...body,
      updatedAt: '2025-01-13T00:00:00.000Z',
    });
  }),

  http.delete('/api/manifests/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/manifests/:id/re-extract', () => {
    return HttpResponse.json({ jobId: 'test-job-id' });
  }),

  http.post('/api/manifests/:id/extract', () => {
    return HttpResponse.json({ jobId: 'test-job-id' });
  }),

  http.post('/api/manifests/:id/trigger', () => {
    return HttpResponse.json({ success: true });
  }),
];
