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
  if (file.mimetype !== PDF_MIME_TYPE) {
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

@Injectable()
export class PdfFileInterceptor implements NestInterceptor {
  private readonly interceptor = new (FileInterceptor('file', multerOptions))();

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<unknown> {
    try {
      return await this.interceptor.intercept(context, next);
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

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<unknown> {
    try {
      return await this.interceptor.intercept(context, next);
    } catch (error) {
      throw mapMulterError(error);
    }
  }
}
