import { Module } from '@nestjs/common';
import { PdfToImageService } from './pdf-to-image.service';
import { PdfToImgConverterAdapter, IPdfConverterAdapter } from './pdf-converter-adapter.service';
import { FileAccessModule } from '../file-access/file-access.module';

@Module({
  imports: [FileAccessModule],
  providers: [
    PdfToImageService,
    {
      provide: 'IPdfConverterAdapter',
      useClass: PdfToImgConverterAdapter,
    },
  ],
  exports: [PdfToImageService],
})
export class PdfToImageModule {}
