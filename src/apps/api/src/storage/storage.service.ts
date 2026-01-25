import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

import { FileNotFoundException } from './exceptions/file-not-found.exception';

type StoredFileInfo = {
  filename: string;
  originalFilename: string;
  storagePath: string;
  fileSize: number;
  publicPath: string;
};

@Injectable()
export class StorageService {
  private readonly uploadsRoot = path.resolve(process.cwd(), 'uploads');
  private readonly publicUploadsBasePath: string;

  constructor(private readonly configService: ConfigService) {
    const normalizeBasePath = (value: unknown): string => {
      if (typeof value !== 'string') return '';
      const trimmed = value.trim();
      if (!trimmed || trimmed === '/') return '';
      const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
    };

    const basePath = normalizeBasePath(this.configService.get('server.basePath'));
    this.publicUploadsBasePath = basePath
      ? `${basePath}/api/uploads`
      : '/api/uploads';
  }

  getStoragePath(projectId: number, groupId: number): string {
    return path.join(
      this.uploadsRoot,
      'projects',
      String(projectId),
      'groups',
      String(groupId),
      'manifests',
    );
  }

  async ensureDirectoryExists(
    projectId: number,
    groupId: number,
  ): Promise<string> {
    const directory = this.getStoragePath(projectId, groupId);
    try {
      await fs.mkdir(directory, { recursive: true });
      return directory;
    } catch (error) {
      throw new InternalServerErrorException(
        'Unable to create upload directory',
      );
    }
  }

  async saveFile(
    file: Express.Multer.File | undefined,
    projectId: number,
    groupId: number,
  ): Promise<StoredFileInfo> {
    if (!file) {
      throw new FileNotFoundException();
    }

    const directory = await this.ensureDirectoryExists(projectId, groupId);
    const safeOriginalName = path.basename(file.originalname || 'upload.pdf');
    const filename =
      file.filename || `${randomUUID()}-${safeOriginalName}`;
    const storagePath = path.join(directory, filename);

    try {
      if (file.path) {
        await fs.rename(file.path, storagePath);
      } else if (file.buffer) {
        await fs.writeFile(storagePath, file.buffer);
      } else {
        throw new FileNotFoundException();
      }
    } catch (error) {
      throw new InternalServerErrorException('Unable to save uploaded file');
    }

    return {
      filename,
      originalFilename: safeOriginalName,
      storagePath,
      fileSize: file.size ?? 0,
      publicPath: this.getPublicPath(storagePath),
    };
  }

  async deleteFile(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new FileNotFoundException();
      }
      throw new InternalServerErrorException('Unable to delete file');
    }
  }

  getPublicPath(filepath: string): string {
    const relativePath = path.relative(this.uploadsRoot, filepath);
    const normalizedPath = relativePath.split(path.sep).join('/');
    return `${this.publicUploadsBasePath}/${normalizedPath}`;
  }
}
