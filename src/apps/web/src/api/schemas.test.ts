import { http, HttpResponse } from 'msw';
import { schemasApi } from './schemas';
import { server } from '@/tests/mocks/server';
import { makeSchema, makeSchemaRule } from '@/tests/mocks/factories';
import apiClient from '@/api/client';
import { vi } from 'vitest';

describe('schemasApi', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('lists schemas', async () => {
    server.use(
      http.get('/api/schemas', () => HttpResponse.json([makeSchema({ id: 1 })])),
    );

    const result = await schemasApi.listSchemas();
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });

  it('gets a schema by id', async () => {
    server.use(
      http.get('/api/schemas/2', () => HttpResponse.json(makeSchema({ id: 2 }))),
    );

    const result = await schemasApi.getSchema(2);
    expect(result.id).toBe(2);
  });

  it('gets schemas for a project', async () => {
    server.use(
      http.get('/api/schemas/project/10', () =>
        HttpResponse.json([makeSchema({ id: 3, projectId: 10 })]),
      ),
    );

    const result = await schemasApi.getProjectSchemas(10);
    expect(result).toHaveLength(1);
    expect(result[0]?.projectId).toBe(10);
  });

  it('creates and updates a schema', async () => {
    let createdBody: unknown = null;
    let updatedBody: unknown = null;

    server.use(
      http.post('/api/schemas', async ({ request }) => {
        createdBody = await request.json();
        return HttpResponse.json(makeSchema({ id: 99 }));
      }),
      http.patch('/api/schemas/99', async ({ request }) => {
        updatedBody = await request.json();
        return HttpResponse.json(makeSchema({ id: 99, name: 'Updated' }));
      }),
    );

    const created = await schemasApi.createSchema({ name: 'New', projectId: 1, jsonSchema: {} } as any);
    expect(created.id).toBe(99);
    expect(createdBody).toEqual({ name: 'New', projectId: 1, jsonSchema: {} });

    const updated = await schemasApi.updateSchema(99, { name: 'Updated' } as any);
    expect(updated.id).toBe(99);
    expect((updated as any).name).toBe('Updated');
    expect(updatedBody).toEqual({ name: 'Updated' });
  });

  it('deletes a schema', async () => {
    let called = false;
    server.use(
      http.delete('/api/schemas/123', () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await schemasApi.deleteSchema(123);
    expect(called).toBe(true);
  });

  it('manages schema rules', async () => {
    let createdBody: unknown = null;
    let updatedBody: unknown = null;

    server.use(
      http.get('/api/schemas/5/rules', () => HttpResponse.json([makeSchemaRule({ id: 1, schemaId: 5 })])),
      http.post('/api/schemas/5/rules', async ({ request }) => {
        createdBody = await request.json();
        return HttpResponse.json(makeSchemaRule({ id: 2, schemaId: 5 }));
      }),
      http.patch('/api/schemas/5/rules/2', async ({ request }) => {
        updatedBody = await request.json();
        return HttpResponse.json(makeSchemaRule({ id: 2, schemaId: 5, description: 'Updated Rule' }));
      }),
      http.delete('/api/schemas/5/rules/2', () => HttpResponse.json({ ok: true })),
    );

    const listed = await schemasApi.listSchemaRules(5);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.schemaId).toBe(5);

    const created = await schemasApi.createSchemaRule(5, {
      fieldPath: 'document.field',
      ruleType: 'verification',
      ruleOperator: 'pattern',
      ruleConfig: { pattern: '.*' },
      enabled: true,
      priority: 1,
    } as any);
    expect(created.id).toBe(2);
    expect(createdBody).toEqual({
      fieldPath: 'document.field',
      ruleType: 'verification',
      ruleOperator: 'pattern',
      ruleConfig: { pattern: '.*' },
      enabled: true,
      priority: 1,
    });

    const updated = await schemasApi.updateSchemaRule(5, 2, { description: 'Updated Rule' } as any);
    expect(updated.id).toBe(2);
    expect(updated.description).toBe('Updated Rule');
    expect(updatedBody).toEqual({ description: 'Updated Rule' });

    const deleted = await schemasApi.deleteSchemaRule(5, 2);
    expect(deleted).toEqual({ ok: true });
  });

  it('supports AI generation endpoints', async () => {
    let schemaBody: unknown = null;
    let rulesBody: unknown = null;
    let rulesFromSchemaBody: unknown = null;
    let promptRulesBody: unknown = null;

    server.use(
      http.post('/api/schemas/generate', async ({ request }) => {
        schemaBody = await request.json();
        return HttpResponse.json({ jsonSchema: { type: 'object' } });
      }),
      http.post('/api/schemas/7/generate-rules', async ({ request }) => {
        rulesBody = await request.json();
        return HttpResponse.json({ rules: [] });
      }),
      http.post('/api/schemas/generate-rules', async ({ request }) => {
        rulesFromSchemaBody = await request.json();
        return HttpResponse.json({ rules: [] });
      }),
      http.post('/api/schemas/7/generate-prompt-rules', async ({ request }) => {
        promptRulesBody = await request.json();
        return HttpResponse.json({ rulesMarkdown: '# Rules' });
      }),
    );

    const generated = await schemasApi.generateSchema({ prompt: 'p' } as any);
    expect(generated.jsonSchema).toEqual({ type: 'object' });
    expect(schemaBody).toEqual({ prompt: 'p' });

    const rules = await schemasApi.generateRules(7, { prompt: 'r' } as any);
    expect(rules.rules).toEqual([]);
    expect(rulesBody).toEqual({ prompt: 'r' });

    const rulesFromSchema = await schemasApi.generateRulesFromSchema({ prompt: 'r2' } as any);
    expect(rulesFromSchema.rules).toEqual([]);
    expect(rulesFromSchemaBody).toEqual({ prompt: 'r2' });

    const promptRules = await schemasApi.generatePromptRulesMarkdown(7, { modelId: 'm', prompt: 'p' });
    expect(promptRules.rulesMarkdown).toBe('# Rules');
    expect(promptRulesBody).toEqual({ modelId: 'm', prompt: 'p' });
  });

  it('validates schema definitions', async () => {
    let validateBody: unknown = null;
    let validateRequiredBody: unknown = null;

    server.use(
      http.post('/api/schemas/validate', async ({ request }) => {
        validateBody = await request.json();
        return HttpResponse.json({ valid: false, errors: [{ message: 'bad' }] });
      }),
      http.post('/api/schemas/validate-with-required', async ({ request }) => {
        validateRequiredBody = await request.json();
        return HttpResponse.json({ valid: true });
      }),
    );

    const validation = await schemasApi.validateSchemaDefinition({ jsonSchema: '{}' } as any);
    expect(validation.valid).toBe(false);
    expect(validateBody).toEqual({ jsonSchema: '{}' });

    const required = await schemasApi.validateWithRequired({ jsonSchema: '{}' } as any);
    expect(required.valid).toBe(true);
    expect(validateRequiredBody).toEqual({ jsonSchema: '{}' });
  });

  it('imports a schema via multipart upload', async () => {
    const postSpy = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { valid: true, jsonSchema: { type: 'object' } } } as any);

    const result = await schemasApi.importSchema({ file: new Blob(['{}'], { type: 'application/json' }) } as any);
    expect(result.valid).toBe(true);
    expect(result.jsonSchema).toEqual({ type: 'object' });

    expect(postSpy).toHaveBeenCalledWith(
      '/schemas/import',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'multipart/form-data',
        }),
      }),
    );

    postSpy.mockRestore();
  });
});
