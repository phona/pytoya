import { Module } from '@nestjs/common';
import { PdfToImageService } from './pdf-to-image.service';
import {
  PdfToImgConverterAdapter,
  PdfToImgModuleLoader,
} from './pdf-converter-adapter.service';
import { FileAccessModule } from '../file-access/file-access.module';

@Module({
  imports: [FileAccessModule],
  providers: [
    PdfToImageService,
    {
      provide: 'IPdfToImgModuleLoader',
      useClass: PdfToImgModuleLoader,
    },
    {
      provide: 'IPdfConverterAdapter',
      useClass: PdfToImgConverterAdapter,
    },
  ],
  exports: [PdfToImageService],
})
export class PdfToImageModule {}
