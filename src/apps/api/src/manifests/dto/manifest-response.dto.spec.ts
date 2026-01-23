import { ManifestResponseDto } from './manifest-response.dto';
import { FileType, ManifestEntity, ManifestStatus } from '../../entities/manifest.entity';

const createManifest = (overrides: Partial<ManifestEntity> = {}): ManifestEntity => ({
  id: 1,
  filename: 'invoice-001.pdf',
  originalFilename: 'invoice-001.pdf',
  storagePath: '/uploads/invoice-001.pdf',
  fileSize: 1024,
  fileType: FileType.PDF,
  status: ManifestStatus.PENDING,
  groupId: 1,
  extractedData: null,
  confidence: null,
  purchaseOrder: null,
  invoiceDate: null,
  department: null,
  humanVerified: false,
  validationResults: null,
  ocrResult: null,
  ocrProcessedAt: null,
  ocrQualityScore: null,
  extractionCost: null,
  textExtractorId: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  group: null as any,
  jobs: [],
  textExtractor: null,
  manifestItems: [],
  extractionHistory: [],
  ...overrides,
  contentSha256: overrides.contentSha256 ?? null,
  textCost: overrides.textCost ?? null,
  llmCost: overrides.llmCost ?? null,
  extractionCostCurrency: overrides.extractionCostCurrency ?? null,
});

describe('ManifestResponseDto', () => {
  it('omits OCR result by default', () => {
    const manifest = createManifest({
      ocrResult: { document: { type: 'invoice', language: ['en'], pages: 1 } },
    });

    const result = ManifestResponseDto.fromEntity(manifest);

    expect(result.ocrResult).toBeNull();
  });

  it('includes OCR result when requested', () => {
    const ocrResult = { document: { type: 'invoice', language: ['en'], pages: 1 } };
    const manifest = createManifest({ ocrResult: ocrResult as any });

    const result = ManifestResponseDto.fromEntity(manifest, { includeOcr: true });

    expect(result.ocrResult).toEqual(ocrResult);
  });

  it('normalizes extraction cost values', () => {
    const manifest = createManifest({ extractionCost: '0.1234' as unknown as number });

    const result = ManifestResponseDto.fromEntity(manifest);

    expect(result.extractionCost).toBe(0.1234);
  });
});
