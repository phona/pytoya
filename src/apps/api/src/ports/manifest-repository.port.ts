export type ManifestRecord = {
  id: number;
  groupId: number;
  status: string;
  extractedData: unknown;
  ocrResult: unknown;
};

export interface ManifestRepositoryPort {
  findById(manifestId: number): Promise<ManifestRecord | null>;
  save(record: ManifestRecord): Promise<ManifestRecord>;
}
