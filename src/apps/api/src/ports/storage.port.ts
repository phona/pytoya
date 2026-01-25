export type StoredFile = {
  filename: string;
  originalFilename: string;
  storagePath: string;
  fileSize: number;
  publicPath: string;
};

export interface StoragePort {
  saveFile(options: {
    projectId: number;
    groupId: number;
    manifestId?: number;
    file: Express.Multer.File;
  }): Promise<StoredFile>;

  getPublicPath(storagePath: string): string;
}
