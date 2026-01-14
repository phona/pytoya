import {
  FileType,
  ManifestEntity,
  ManifestStatus,
  ValidationResult,
} from '../../entities/manifest.entity';

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
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(manifest: ManifestEntity): ManifestResponseDto {
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
      createdAt: manifest.createdAt,
      updatedAt: manifest.updatedAt,
    };
  }
}
