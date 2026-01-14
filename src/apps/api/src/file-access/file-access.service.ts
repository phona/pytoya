import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for file system operations.
 * Allows mocking in tests without using jest.mock().
 */
export interface IFileAccessService {
  /**
   * Read a file as Buffer.
   * @param filePath - Absolute path to the file
   * @returns File contents as Buffer
   */
  readFile(filePath: string): Promise<Buffer>;

  /**
   * Get file statistics.
   * @param filePath - Absolute path to the file
   * @returns File stats including size and whether it's a file
   */
  getFileStats(filePath: string): Promise<FileStats>;

  /**
   * Check if a file exists.
   * @param filePath - Absolute path to the file
   * @returns true if file exists, false otherwise
   */
  fileExists(filePath: string): boolean;

  /**
   * Ensure a directory exists, creating if necessary.
   * @param dirPath - Absolute path to the directory
   */
  ensureDirectory(dirPath: string): Promise<void>;

  /**
   * Write buffer to a file.
   * @param filePath - Absolute path to the file
   * @param data - Buffer to write
   */
  writeFile(filePath: string, data: Buffer): Promise<void>;

  /**
   * Move a file from source to destination.
   * @param sourcePath - Current file location
   * @param destPath - New file location
   */
  moveFile(sourcePath: string, destPath: string): Promise<void>;

  /**
   * Delete a file.
   * @param filePath - Absolute path to the file
   */
  deleteFile(filePath: string): Promise<void>;
}

/**
 * File statistics returned by getFileStats.
 */
export interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
}

/**
 * Default implementation using Node.js fs module.
 * Uses promises for async operations.
 */
@Injectable()
export class FileAccessService implements IFileAccessService {
  async readFile(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(filePath);
  }

  async getFileStats(filePath: string): Promise<FileStats> {
    const stats = await fs.promises.stat(filePath);
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  }

  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  async writeFile(filePath: string, data: Buffer): Promise<void> {
    await fs.promises.writeFile(filePath, data);
  }

  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    await fs.promises.rename(sourcePath, destPath);
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.promises.unlink(filePath);
  }
}
