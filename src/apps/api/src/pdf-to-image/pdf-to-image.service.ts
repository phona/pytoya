import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';

import {
  IPdfConverterAdapter,
  PdfConversionOptions,
  PdfDoc,
} from './pdf-converter-adapter.service';
import { IFileAccessService } from '../file-access/file-access.service';

export interface ConvertPdfToImagesOptions {
  /**
   * Scale factor for output images (1 = 72 DPI, 2 = 144 DPI, etc.)
   * Higher scale produces larger, clearer images but uses more memory
   */
  scale?: number;
}

export interface ConvertedPage {
  pageNumber: number;
  buffer: Buffer;
  mimeType: string;
}

/**
 * Service for converting PDF documents to images.
 * Uses injected adapters for PDF conversion and file system access,
 * making it fully testable without jest.mock().
 */
@Injectable()
export class PdfToImageService {
  private readonly DEFAULT_SCALE = 2; // 144 DPI for good quality

  constructor(
    @Inject('IPdfConverterAdapter')
    private readonly pdfAdapter: IPdfConverterAdapter,
    @Inject('IFileAccessService')
    private readonly fileSystem: IFileAccessService,
  ) {}

  /**
   * Convert a PDF file to images, one image per page
   * @param pdfPath - Absolute path to the PDF file
   * @param options - Conversion options
   * @returns Array of converted pages with buffers
   */
  async convertPdfToImages(
    pdfPath: string,
    options: ConvertPdfToImagesOptions = {},
  ): Promise<ConvertedPage[]> {
    const { scale = this.DEFAULT_SCALE } = options;

    // Validate PDF exists using injected file system service
    if (!this.fileSystem.fileExists(pdfPath)) {
      throw new NotFoundException(`PDF file not found: ${pdfPath}`);
    }

    const pages: ConvertedPage[] = [];

    try {
      // Use injected adapter for PDF conversion
      const doc = await this.pdfAdapter.convert(pdfPath, { scale });

      // Convert all pages using async iterator
      let pageNumber = 1;
      for await (const buffer of doc) {
        pages.push({
          pageNumber,
          buffer,
          mimeType: 'image/png',
        });
        pageNumber++;
      }

      return pages;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to convert PDF to images: ${message}`,
      );
    }
  }

  /**
   * Convert a specific page of a PDF to an image
   * @param pdfPath - Absolute path to the PDF file
   * @param pageNumber - Page number to convert (1-indexed)
   * @param options - Conversion options
   * @returns Converted page buffer
   */
  async convertPdfPageToImage(
    pdfPath: string,
    pageNumber: number,
    options: ConvertPdfToImagesOptions = {},
  ): Promise<ConvertedPage> {
    const { scale = this.DEFAULT_SCALE } = options;

    // Validate PDF exists
    if (!this.fileSystem.fileExists(pdfPath)) {
      throw new NotFoundException(`PDF file not found: ${pdfPath}`);
    }

    if (pageNumber < 1) {
      throw new BadRequestException(
        `Page number must be >= 1, got ${pageNumber}`,
      );
    }

    try {
      // Use injected adapter for PDF conversion
      const doc = await this.pdfAdapter.convert(pdfPath, { scale });

      const buffer = await doc.getPage(pageNumber);

      return {
        pageNumber,
        buffer,
        mimeType: 'image/png',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to convert PDF page ${pageNumber} to image: ${message}`,
      );
    }
  }

  /**
   * Get the number of pages in a PDF
   * @param pdfPath - Absolute path to the PDF file
   * @returns Number of pages
   */
  async getPageCount(pdfPath: string): Promise<number> {
    if (!this.fileSystem.fileExists(pdfPath)) {
      throw new NotFoundException(`PDF file not found: ${pdfPath}`);
    }

    try {
      const doc = await this.pdfAdapter.convert(pdfPath);
      return doc.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to get PDF page count: ${message}`,
      );
    }
  }

  /**
   * Convert converted pages to base64 data URLs for use with vision LLMs
   * @param pages - Array of converted pages
   * @returns Array of data URLs
   */
  pagesToDataUrls(pages: ConvertedPage[]): string[] {
    return pages.map(
      (page) =>
        `data:${page.mimeType};base64,${page.buffer.toString('base64')}`,
    );
  }

  /**
   * Save converted pages to disk
   * @param pages - Array of converted pages
   * @param outputDir - Output directory path
   * @param filenamePrefix - Prefix for output filenames
   * @returns Array of saved file paths
   */
  async savePagesToDisk(
    pages: ConvertedPage[],
    outputDir: string,
    filenamePrefix = 'page',
  ): Promise<string[]> {
    // Create output directory if it doesn't exist (using injected service)
    await this.fileSystem.ensureDirectory(outputDir);

    const savedPaths: string[] = [];

    for (const page of pages) {
      const ext = this.getExtension(page.mimeType);
      const filename = `${filenamePrefix}-${page.pageNumber}${ext}`;
      const filePath = path.join(outputDir, filename);

      // Write file using injected service
      await this.fileSystem.writeFile(filePath, page.buffer);
      savedPaths.push(filePath);
    }

    return savedPaths;
  }

  private getExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/png':
        return '.png';
      case 'image/jpeg':
        return '.jpg';
      case 'image/webp':
        return '.webp';
      default:
        return '.png';
    }
  }
}
