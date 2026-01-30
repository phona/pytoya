import { CsvExportService } from './csv-export.service';

describe('CsvExportService', () => {
  const user = { id: 7 } as any;

  const createQueryBuilder = (manifests: any[]) => {
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(manifests.length),
      getMany: jest.fn().mockResolvedValue(manifests),
    };
    return qb;
  };

  it('exports schema-driven extracted-data columns in x-table-columns order', async () => {
    const schemaRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        jsonSchema: { 'x-table-columns': ['invoice.po_no', 'department.code'] },
      }),
    };
    const projectRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 1, ownerId: 7, defaultSchemaId: 10 }),
    };
    const groupRepository = { findOne: jest.fn() };

    const manifests = [
      {
        id: 123,
        originalFilename: 'doc.pdf',
        status: 'completed',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        confidence: 0.9,
        humanVerified: false,
        extractionCost: null,
        extractionCostCurrency: null,
        extractedData: {
          invoice: { po_no: '0000009' },
          department: { code: 'FIN' },
        },
        group: {
          name: 'Group A',
          project: { name: 'Project A', id: 1, defaultSchemaId: 10 },
        },
      },
    ];

    const qb = createQueryBuilder(manifests);
    const manifestRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const service = new CsvExportService(
      manifestRepository as any,
      groupRepository as any,
      projectRepository as any,
      schemaRepository as any,
    );

    const result = await service.exportCsv(user, { projectId: 1 });
    const [headerLine, rowLine] = result.csv.split('\n');

    expect(headerLine).toBe(
      [
        'project_name',
        'group_name',
        'manifest_id',
        'original_filename',
        'status',
        'created_at',
        'confidence',
        'human_verified',
        'extraction_cost',
        'extraction_cost_currency',
        'invoice.po_no',
        'department.code',
      ].join(','),
    );

    const cells = rowLine.split(',');
    expect(cells[0]).toBe('Project A');
    expect(cells[1]).toBe('Group A');
    expect(cells[2]).toBe('123');
    expect(cells[3]).toBe('doc.pdf');
    expect(cells[4]).toBe('completed');
    expect(cells[6]).toBe('0.9');
    expect(cells[7]).toBe('false');
    expect(cells[10]).toBe('0000009');
    expect(cells[11]).toBe('FIN');
  });

  it('falls back to JSON-stringified extractedData when x-table-columns is empty/absent', async () => {
    const schemaRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        jsonSchema: { 'x-table-columns': [] },
      }),
    };
    const projectRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 1, ownerId: 7, defaultSchemaId: 10 }),
    };
    const groupRepository = { findOne: jest.fn() };

    const manifests = [
      {
        id: 1,
        originalFilename: 'doc.pdf',
        status: 'completed',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        confidence: null,
        humanVerified: false,
        extractionCost: null,
        extractionCostCurrency: null,
        extractedData: { invoice: { po_no: 'X' } },
        group: {
          name: 'Group A',
          project: { name: 'Project A', id: 1, defaultSchemaId: 10 },
        },
      },
    ];

    const qb = createQueryBuilder(manifests);
    const manifestRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const service = new CsvExportService(
      manifestRepository as any,
      groupRepository as any,
      projectRepository as any,
      schemaRepository as any,
    );

    const result = await service.exportCsv(user, { projectId: 1 });
    const [headerLine, rowLine] = result.csv.split('\n');

    expect(headerLine.split(',').slice(-1)[0]).toBe('extractedDataJson');
    expect(rowLine).toContain('\"{'); // JSON string is quoted in CSV
  });
});
