import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConvertedPage } from './pdf-to-image.service';

/**
 * PDF document interface returned by converter adapter.
 */
export interface PdfDoc {
  /** Total number of pages in the PDF */
  length: number;

  /** Get a specific page as a Buffer */
  getPage(pageNumber: number): Promise<Buffer>;

  /** Async iterator for streaming all pages */
  [Symbol.asyncIterator](): AsyncIterator<Buffer>;
}

/**
 * Options for PDF conversion.
 */
export interface PdfConversionOptions {
  /** Scale factor for rendering (default: 2) */
  scale?: number;
  /** Render in grayscale */
  grayscale?: boolean;
}

/**
 * Interface for PDF to image conversion.
 * Abstracts the pdf-to-img library for easier testing.
 */
export interface IPdfConverterAdapter {
  /**
   * Convert a PDF to pages.
   * @param input - PDF file path or buffer
   * @param options - Conversion options
   * @returns PDF document with page iterator
   */
  convert(
    input: string | Buffer | Uint8Array,
    options?: PdfConversionOptions,
  ): Promise<PdfDoc>;
}

/**
 * Default implementation using pdf-to-img library.
 * Uses dynamic import since pdf-to-img is ESM-only.
 */
@Injectable()
export class PdfToImgConverterAdapter implements IPdfConverterAdapter {
  private pdfToImg: any = null;

  async convert(
    input: string | Buffer | Uint8Array,
    options: PdfConversionOptions = {},
  ): Promise<PdfDoc> {
    const pdfFunc = await this.getPdfToImg();

    const scale = options.scale ?? 2;
    const conversion = await pdfFunc(input, { scale });

    // Wrap in our interface
    return {
      length: conversion.length,
      getPage: (pageNumber: number) => conversion.getPage(pageNumber),
      [Symbol.asyncIterator]: () => conversion[Symbol.asyncIterator](),
    } as PdfDoc;
  }

  /**
   * Lazy load the pdf-to-img module.
   * Cached after first load.
   */
  private async getPdfToImg(): Promise<any> {
    if (!this.pdfToImg) {
      const module = await import('pdf-to-img');
      const pdfFunc = (module as unknown as { default: any }).default;

      if (!pdfFunc) {
        throw new InternalServerErrorException(
          'pdf-to-img module does not export a default function',
        );
      }

      this.pdfToImg = pdfFunc;
    }
    return this.pdfToImg;
  }
}
