import { Test, TestingModule } from '@nestjs/testing';
import * as path from 'path';

import { PdfToImageService, ConvertPdfToImagesOptions, ConvertedPage } from './pdf-to-image.service';
import { IPdfConverterAdapter, PdfDoc } from './pdf-converter-adapter.service';
import { IFileAccessService } from '../file-access/file-access.service';

/**
 * Unit tests for PdfToImageService.
 * Uses dependency injection for mocking, following project testing guidelines.
 */
describe('PdfToImageService', () => {
  let service: PdfToImageService;
  let mockPdfAdapter: jest.Mocked<IPdfConverterAdapter>;
  let mockFileSystem: jest.Mocked<IFileAccessService>;

  // Helper to create a mock PDF document
  const createMockDoc = (pageCount = 2): PdfDoc => ({
    length: pageCount,
    getPage: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
    [Symbol.asyncIterator]: async function* () {
      for (let i = 1; i <= pageCount; i++) {
        yield Buffer.from(`fake-image-page-${i}`);
      }
    },
  });

  beforeEach(async () => {
    // Create mock adapters
    mockPdfAdapter = {
      convert: jest.fn(),
    } as unknown as jest.Mocked<IPdfConverterAdapter>;

    mockFileSystem = {
      readFile: jest.fn(),
      getFileStats: jest.fn(),
      fileExists: jest.fn().mockReturnValue(true),
      ensureDirectory: jest.fn(),
      writeFile: jest.fn(),
      moveFile: jest.fn(),
      deleteFile: jest.fn(),
    } as unknown as jest.Mocked<IFileAccessService>;

    // Mock PDF adapter to return a valid document by default
    mockPdfAdapter.convert.mockResolvedValue(createMockDoc());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfToImageService,
        {
          provide: 'IPdfConverterAdapter',
          useValue: mockPdfAdapter,
        },
        {
          provide: 'IFileAccessService',
          useValue: mockFileSystem,
        },
      ],
    }).compile();

    service = module.get<PdfToImageService>(PdfToImageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('convertPdfToImages', () => {
    it('should throw error if PDF file does not exist', async () => {
      mockFileSystem.fileExists.mockReturnValue(false);

      await expect(
        service.convertPdfToImages('/nonexistent/file.pdf'),
      ).rejects.toThrow('PDF file not found');
    });

    it('should convert PDF to images with default options', async () => {
      const result = await service.convertPdfToImages('/test/file.pdf');

      expect(mockPdfAdapter.convert).toHaveBeenCalledWith('/test/file.pdf', {
        scale: 2,
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        pageNumber: 1,
        mimeType: 'image/png',
      });
      expect(result[0].buffer).toBeInstanceOf(Buffer);
    });

    it('should convert PDF with custom scale option', async () => {
      const options: ConvertPdfToImagesOptions = { scale: 3 };

      await service.convertPdfToImages('/test/file.pdf', options);

      expect(mockPdfAdapter.convert).toHaveBeenCalledWith('/test/file.pdf', {
        scale: 3,
      });
    });

    it('should handle PDF conversion errors gracefully', async () => {
      mockPdfAdapter.convert.mockRejectedValue(new Error('Conversion failed'));

      await expect(
        service.convertPdfToImages('/test/file.pdf'),
      ).rejects.toThrow('Failed to convert PDF to images');
    });

    it('should handle single page PDF', async () => {
      mockPdfAdapter.convert.mockResolvedValue(createMockDoc(1));

      const result = await service.convertPdfToImages('/test/file.pdf');

      expect(result).toHaveLength(1);
      expect(result[0].pageNumber).toBe(1);
    });

    it('should handle multi-page PDF', async () => {
      mockPdfAdapter.convert.mockResolvedValue(createMockDoc(5));

      const result = await service.convertPdfToImages('/test/file.pdf');

      expect(result).toHaveLength(5);
      expect(result[4].pageNumber).toBe(5);
    });
  });

  describe('convertPdfPageToImage', () => {
    it('should convert specific page to image', async () => {
      const mockDoc = createMockDoc();
      mockPdfAdapter.convert.mockResolvedValue(mockDoc);

      const result = await service.convertPdfPageToImage('/test/file.pdf', 1);

      expect(result.pageNumber).toBe(1);
      expect(result.mimeType).toBe('image/png');
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should throw error for invalid page number (< 1)', async () => {
      await expect(
        service.convertPdfPageToImage('/test/file.pdf', 0),
      ).rejects.toThrow('Page number must be >= 1');
    });

    it('should throw error if PDF file does not exist', async () => {
      mockFileSystem.fileExists.mockReturnValue(false);

      await expect(
        service.convertPdfPageToImage('/nonexistent/file.pdf', 1),
      ).rejects.toThrow('PDF file not found');
    });

    it('should call getPage with correct page number', async () => {
      const mockDoc = createMockDoc();
      const getPageSpy = jest.spyOn(mockDoc, 'getPage');
      mockPdfAdapter.convert.mockResolvedValue(mockDoc);

      await service.convertPdfPageToImage('/test/file.pdf', 2);

      expect(getPageSpy).toHaveBeenCalledWith(2);
    });
  });

  describe('getPageCount', () => {
    it('should return number of pages in PDF', async () => {
      mockPdfAdapter.convert.mockResolvedValue(createMockDoc(3));

      const count = await service.getPageCount('/test/file.pdf');

      expect(count).toBe(3);
    });

    it('should throw error if PDF file does not exist', async () => {
      mockFileSystem.fileExists.mockReturnValue(false);

      await expect(
        service.getPageCount('/nonexistent/file.pdf'),
      ).rejects.toThrow('PDF file not found');
    });
  });

  describe('pagesToDataUrls', () => {
    it('should convert pages to base64 data URLs', () => {
      const pages: ConvertedPage[] = [
        {
          pageNumber: 1,
          buffer: Buffer.from('test-image-data'),
          mimeType: 'image/png',
        },
      ];

      const result = service.pagesToDataUrls(pages);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatch(/^data:image\/png;base64,/);
      expect(result[0]).toContain('dGVzdC1pbWFnZS1kYXRh'); // base64 of 'test-image-data'
    });

    it('should handle multiple pages', () => {
      const pages: ConvertedPage[] = [
        {
          pageNumber: 1,
          buffer: Buffer.from('page1'),
          mimeType: 'image/png',
        },
        {
          pageNumber: 2,
          buffer: Buffer.from('page2'),
          mimeType: 'image/jpeg',
        },
      ];

      const result = service.pagesToDataUrls(pages);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatch(/^data:image\/png;base64,/);
      expect(result[1]).toMatch(/^data:image\/jpeg;base64,/);
    });
  });

  describe('savePagesToDisk', () => {
    it('should save pages to disk with correct filenames', async () => {
      const pages: ConvertedPage[] = [
        {
          pageNumber: 1,
          buffer: Buffer.from('test-image'),
          mimeType: 'image/png',
        },
        {
          pageNumber: 2,
          buffer: Buffer.from('test-image-2'),
          mimeType: 'image/jpeg',
        },
      ];

      const outputDir = '/output';
      const result = await service.savePagesToDisk(pages, outputDir, 'doc');

      expect(mockFileSystem.ensureDirectory).toHaveBeenCalledWith(outputDir);
      expect(mockFileSystem.writeFile).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'doc-1.png'),
        pages[0].buffer,
      );
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'doc-2.jpg'),
        pages[1].buffer,
      );
      expect(result).toHaveLength(2);
    });

    it('should use default prefix if not provided', async () => {
      const pages: ConvertedPage[] = [
        {
          pageNumber: 1,
          buffer: Buffer.from('test'),
          mimeType: 'image/png',
        },
      ];

      const outputDir = '/output';
      await service.savePagesToDisk(pages, outputDir);

      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'page-1.png'),
        expect.any(Buffer),
      );
    });
  });
});
