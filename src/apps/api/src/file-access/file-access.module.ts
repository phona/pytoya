import { Global, Module } from '@nestjs/common';
import { FileAccessService, IFileAccessService } from './file-access.service';

/**
 * Global module providing file access services.
 * Using @Global() decorator so this module is available everywhere
 * without explicit imports in other modules.
 */
@Global()
@Module({
  providers: [
    {
      provide: 'IFileAccessService',
      useClass: FileAccessService,
    },
    FileAccessService,
  ],
  exports: [
    {
      provide: 'IFileAccessService',
      useClass: FileAccessService,
    },
    FileAccessService,
  ],
})
export class FileAccessModule {}
