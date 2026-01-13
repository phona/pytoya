import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ManifestEntity } from '../entities/manifest.entity';
import { QueueModule } from '../queue/queue.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [TypeOrmModule.forFeature([ManifestEntity]), QueueModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
