import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueueService } from '../queue/queue.service';
import { JobsFilterDto } from './dto/jobs-filter.dto';
import { JobsService } from './jobs.service';

@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly queueService: QueueService,
  ) {}

  @Get('stats')
  async getStats() {
    return this.jobsService.getJobStats();
  }

  @Get('history')
  async getJobHistory(
    @Query('manifestId') manifestId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedManifestId = this.parseOptionalNumber(manifestId);
    const parsedLimit = this.parseOptionalNumber(limit);
    return this.queueService.getJobHistory(
      parsedManifestId ?? undefined,
      parsedLimit ?? undefined,
    );
  }

  @Get()
  async listJobs(@Query() filters: JobsFilterDto) {
    return this.jobsService.listJobs(filters);
  }

  @Get(':id')
  async getJob(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  private parseOptionalNumber(value?: string): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return parsed;
  }
}
