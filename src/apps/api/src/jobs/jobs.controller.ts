import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JobsFilterDto } from './dto/jobs-filter.dto';
import { JobsService } from './jobs.service';

@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('stats')
  async getStats() {
    return this.jobsService.getJobStats();
  }

  @Get()
  async listJobs(@Query() filters: JobsFilterDto) {
    return this.jobsService.listJobs(filters);
  }

  @Get(':id(\\d+)')
  async getJob(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }
}
