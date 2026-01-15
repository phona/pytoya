/**
 * Factory functions for creating test data
 */

export function createMockUser(overrides = {}) {
  return {
    id: 1,
    username: 'test-user',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockAdmin(overrides = {}) {
  return createMockUser({ role: 'admin', ...overrides });
}

export function createMockProject(overrides = {}) {
  return {
    id: 1,
    name: 'Test Project',
    description: 'Test project description',
    userId: 1,
    defaultProviderId: null,
    defaultPromptId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockGroup(overrides = {}) {
  return {
    id: 1,
    name: 'Test Group',
    projectId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockManifest(overrides = {}) {
  return {
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockProvider(overrides = {}) {
  return {
    id: 1,
    name: 'Test Provider',
    type: 'OPENAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'test-api-key',
    modelName: 'gpt-4',
    temperature: 0.7,
    maxTokens: 4096,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockPrompt(overrides = {}) {
  return {
    id: 1,
    name: 'System Prompt',
    type: 'system',
    content: 'Test prompt content with {{variable}}',
    variables: ['variable'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockJob(overrides = {}) {
  return {
    id: 1,
    manifestId: 1,
    status: 'completed',
    providerId: 1,
    promptId: 1,
    queueJobId: 'test-job-id',
    progress: 100,
    attemptCount: 1,
    errorMessage: null,
    startedAt: new Date(),
    completedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}
