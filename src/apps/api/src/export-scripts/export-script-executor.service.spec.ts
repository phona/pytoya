import { ExportScriptExecutorService } from './export-script-executor.service';

describe('ExportScriptExecutorService', () => {
  const executor = new ExportScriptExecutorService();

  const ctx = {
    format: 'csv' as const,
    schemaColumns: ['invoice.po_no', 'items[0].sku'],
    project: { id: 1, name: 'P' },
    manifest: { id: 123, groupName: 'G' },
    utils: {
      get: (obj: unknown, path: string) => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return undefined;
        return (obj as any)[path];
      },
      set: (obj: unknown, path: string, value: unknown) => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
        (obj as any)[path] = value;
      },
      trimToNull: (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null),
      normalizeWhitespace: (value: unknown) =>
        typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : null,
      toNumberOrNull: (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null),
    },
  };

  it('rejects scripts missing exportRows', () => {
    const result = executor.validateSyntax('function nope() { return []; }');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exportRows');
  });

  it('executes exportRows and returns row objects', async () => {
    const script = `function exportRows(extractedData, ctx) {
  return [{
    "invoice.po_no": extractedData.invoice.po_no,
    sku0: extractedData.items[0].sku,
    project_id: ctx.project.id,
  }];
}`;

    const rows = await executor.executeExportRows(
      script,
      { invoice: { po_no: '0000009' }, items: [{ sku: 'X' }] } as any,
      ctx as any,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ 'invoice.po_no': '0000009', sku0: 'X', project_id: 1 });
  });

  it('rejects non-array return', async () => {
    const script = `function exportRows() { return {}; }`;
    await expect(executor.executeExportRows(script, { a: 1 } as any, ctx as any)).rejects.toThrow(
      'exportRows must return an array',
    );
  });
});

