import {
  Injectable,
  NestInterceptor,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
  type MulterModuleOptions,
} from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import * as fs from 'fs';
import { diskStorage, MulterError } from 'multer';
import * as path from 'path';

import { FileTooLargeException } from '../../storage/exceptions/file-too-large.exception';
import { InvalidFileTypeException } from '../../storage/exceptions/invalid-file-type.exception';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const PDF_MIME_TYPE = 'application/pdf';

// Supported image MIME types for vision-enabled LLMs
const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
] as const;

const ALLOWED_MIME_TYPES = [PDF_MIME_TYPE, ...IMAGE_MIME_TYPES];

export { ALLOWED_MIME_TYPES, IMAGE_MIME_TYPES, PDF_MIME_TYPE };

const TEMP_UPLOADS_PATH = path.resolve(process.cwd(), 'uploads', 'tmp');
const MAX_FILES = 20;

const storage = diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: NodeJS.ErrnoException | null, destination: string) => void,
  ) => {
    fs.mkdir(TEMP_UPLOADS_PATH, { recursive: true }, (error) =>
      cb(error, TEMP_UPLOADS_PATH),
    );
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    const safeOriginalName = path.basename(file.originalname || 'upload.pdf');
    cb(null, `${randomUUID()}-${safeOriginalName}`);
  },
});

const fileFilter: NonNullable<MulterModuleOptions['fileFilter']> = (
  req,
  file,
  cb,
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
    return cb(new InvalidFileTypeException(), false);
  }
  return cb(null, true);
};

const multerOptions: MulterModuleOptions = {
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
};

const mapMulterError = (error: unknown) => {
  if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return new FileTooLargeException();
  }
  return error;
};

/**
 * Detect file type based on MIME type
 * @param mimeType - The MIME type of the file
 * @returns 'pdf' | 'image' | 'unknown'
 */
export function detectFileType(
  mimeType: string,
): 'pdf' | 'image' | 'unknown' {
  if (mimeType === PDF_MIME_TYPE) {
    return 'pdf';
  }
  if (IMAGE_MIME_TYPES.includes(mimeType as any)) {
    return 'image';
  }
  return 'unknown';
}

@Injectable()
export class PdfFileInterceptor implements NestInterceptor {
  private readonly interceptor = new (FileInterceptor('file', multerOptions))();

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): any {
    try {
      const result = this.interceptor.intercept(context, next);
      if (
        result &&
        typeof (result as Promise<unknown>).catch === 'function'
      ) {
        return (result as Promise<unknown>).catch(
          (error) => {
            throw mapMulterError(error);
          },
        );
      }
      return result;
    } catch (error) {
      throw mapMulterError(error);
    }
  }
}

@Injectable()
export class PdfFilesInterceptor implements NestInterceptor {
  private readonly interceptor = new (FilesInterceptor(
    'files',
    MAX_FILES,
    multerOptions,
  ))();

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): any {
    try {
      const result = this.interceptor.intercept(context, next);
      if (
        result &&
        typeof (result as Promise<unknown>).catch === 'function'
      ) {
        return (result as Promise<unknown>).catch(
          (error) => {
            throw mapMulterError(error);
          },
        );
      }
      return result;
    } catch (error) {
      throw mapMulterError(error);
    }
  }
}
