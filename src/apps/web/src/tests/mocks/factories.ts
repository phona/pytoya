import type { Manifest } from '@/api/manifests';
import type { Schema, SchemaRule } from '@/api/schemas';

export const makeManifest = (overrides: Partial<Manifest> = {}): Manifest => {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 1,
    groupId: 1,
    filename: 'document.pdf',
    originalFilename: 'document.pdf',
    storagePath: '/api/uploads/document.pdf',
    fileSize: 123,
    fileType: 'pdf' as any,
    status: 'pending' as any,
    extractedData: null,
    confidence: null,
    humanVerified: false,
    purchaseOrder: null,
    invoiceDate: null,
    department: null,
    validationResults: null,
    ocrResult: null,
    ocrProcessedAt: null,
    ocrQualityScore: null,
    extractionCost: null,
    textCost: null,
    llmCost: null,
    extractionCostCurrency: null,
    textExtractorId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as unknown as Manifest;
};

export const makeSchema = (overrides: Partial<Schema> = {}): Schema => {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 1,
    name: 'Test Schema',
    schemaVersion: null,
    projectId: 1,
    jsonSchema: {},
    requiredFields: [],
    description: null,
    systemPromptTemplate: null,
    validationSettings: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as unknown as Schema;
};

export const makeSchemaRule = (overrides: Partial<SchemaRule> = {}): SchemaRule => {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 1,
    schemaId: 1,
    enabled: true,
    fieldPath: 'document.field',
    ruleType: 'verification' as any,
    ruleOperator: 'pattern' as any,
    ruleConfig: {},
    errorMessage: null,
    priority: 1,
    description: null,
    createdAt: now,
    ...overrides,
  } as unknown as SchemaRule;
};
