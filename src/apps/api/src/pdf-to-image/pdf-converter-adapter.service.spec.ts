import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  IPdfConverterAdapter,
  IPdfToImgModuleLoader,
  PdfToImgConverterAdapter,
} from './pdf-converter-adapter.service';

describe('PdfToImgConverterAdapter', () => {
  let adapter: IPdfConverterAdapter;
  let moduleLoader: jest.Mocked<IPdfToImgModuleLoader>;

  const createConversion = (pageCount = 2) => ({
    length: pageCount,
    getPage: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
    [Symbol.asyncIterator]: async function* () {
      for (let i = 1; i <= pageCount; i++) {
        yield Buffer.from(`fake-image-page-${i}`);
      }
    },
  });

  beforeEach(async () => {
    moduleLoader = {
      load: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfToImgConverterAdapter,
        {
          provide: 'IPdfToImgModuleLoader',
          useValue: moduleLoader,
        },
      ],
    }).compile();

    adapter = module.get<PdfToImgConverterAdapter>(PdfToImgConverterAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves named export `pdf`', async () => {
    const conversion = createConversion(3);
    const pdfFn = jest.fn().mockResolvedValue(conversion);
    moduleLoader.load.mockResolvedValue({ pdf: pdfFn });

    const doc = await adapter.convert('file.pdf', { scale: 3 });

    expect(pdfFn).toHaveBeenCalledWith('file.pdf', { scale: 3 });
    expect(doc.length).toBe(3);
    await expect(doc.getPage(2)).resolves.toBeInstanceOf(Buffer);
  });

  it('resolves default export function when present', async () => {
    const conversion = createConversion(1);
    const pdfFn = jest.fn().mockResolvedValue(conversion);
    moduleLoader.load.mockResolvedValue({ default: pdfFn });

    const doc = await adapter.convert(Buffer.from('pdf'), { scale: 2 });

    expect(pdfFn).toHaveBeenCalledWith(Buffer.from('pdf'), { scale: 2 });
    expect(doc.length).toBe(1);
  });

  it('resolves default wrapper object with `pdf`', async () => {
    const conversion = createConversion(2);
    const pdfFn = jest.fn().mockResolvedValue(conversion);
    moduleLoader.load.mockResolvedValue({ default: { pdf: pdfFn } });

    const doc = await adapter.convert(new Uint8Array([1, 2, 3]), { scale: 4 });

    expect(pdfFn).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), { scale: 4 });
    expect(doc.length).toBe(2);
  });

  it('caches the resolved function', async () => {
    const conversion = createConversion(2);
    const pdfFn = jest.fn().mockResolvedValue(conversion);
    moduleLoader.load.mockResolvedValue({ pdf: pdfFn });

    await adapter.convert('a.pdf', { scale: 2 });
    await adapter.convert('b.pdf', { scale: 2 });

    expect(moduleLoader.load).toHaveBeenCalledTimes(1);
    expect(pdfFn).toHaveBeenCalledTimes(2);
  });

  it('throws when module does not export callable', async () => {
    moduleLoader.load.mockResolvedValue({ notPdf: true });

    await expect(adapter.convert('file.pdf')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});

