import {
  FileType,
  ManifestEntity,
  ManifestStatus,
  ValidationResult,
} from '../../entities/manifest.entity';
import { OcrResultDto } from './ocr-result.dto';

export class ManifestResponseDto {
  id!: number;
  filename!: string;
  originalFilename!: string;
  storagePath!: string;
  fileSize!: number;
  fileType!: FileType;
  status!: ManifestStatus;
  groupId!: number;
  extractedData!: Record<string, unknown> | null;
  confidence!: number | null;
  purchaseOrder!: string | null;
  invoiceDate!: Date | null;
  department!: string | null;
  humanVerified!: boolean;
  validationResults!: ValidationResult | null;
  ocrResult!: OcrResultDto | null;
  ocrProcessedAt!: Date | null;
  ocrQualityScore!: number | null;
  textCost!: number | null;
  llmCost!: number | null;
  extractionCost!: number | null;
  extractionCostCurrency!: string | null;
  textExtractorId!: string | null;
  isDuplicate?: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(
    manifest: ManifestEntity,
    options: { includeOcr?: boolean } = {},
  ): ManifestResponseDto {
    const textCost =
      typeof manifest.textCost === 'string'
        ? Number.parseFloat(manifest.textCost)
        : manifest.textCost ?? null;
    const llmCost =
      typeof manifest.llmCost === 'string'
        ? Number.parseFloat(manifest.llmCost)
        : manifest.llmCost ?? null;
    const extractionCost =
      typeof manifest.extractionCost === 'string'
        ? Number.parseFloat(manifest.extractionCost)
        : manifest.extractionCost ?? null;

    return {
      id: manifest.id,
      filename: manifest.filename,
      originalFilename: manifest.originalFilename,
      storagePath: manifest.storagePath,
      fileSize: manifest.fileSize,
      fileType: manifest.fileType,
      status: manifest.status,
      groupId: manifest.groupId,
      extractedData: manifest.extractedData,
      confidence: manifest.confidence,
      purchaseOrder: manifest.purchaseOrder,
      invoiceDate: manifest.invoiceDate,
      department: manifest.department,
      humanVerified: manifest.humanVerified,
      validationResults: manifest.validationResults,
      ocrResult: options.includeOcr
        ? (manifest.ocrResult as OcrResultDto | null)
        : null,
      ocrProcessedAt: manifest.ocrProcessedAt ?? null,
      ocrQualityScore: manifest.ocrQualityScore ?? null,
      textCost,
      llmCost,
      extractionCost,
      extractionCostCurrency: manifest.extractionCostCurrency ?? null,
      textExtractorId: manifest.textExtractorId ?? null,
      createdAt: manifest.createdAt,
      updatedAt: manifest.updatedAt,
    };
  }
}
