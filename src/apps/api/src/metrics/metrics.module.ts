import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity } from '../entities/job.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ModelEntity } from '../entities/model.entity';
import { CostMetricsService } from './cost-metrics.service';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobEntity,
      ManifestEntity,
      ModelEntity,
    ]),
  ],
  providers: [CostMetricsService],
  controllers: [MetricsController],
  exports: [CostMetricsService],
})
export class MetricsModule {}
