import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PoliciesGuard } from '../auth/casl/policies.guard';
import { CheckPolicies } from '../auth/casl/check-policies.decorator';
import { APP_ACTIONS, APP_SUBJECTS } from '../auth/casl/casl.types';
import { UserEntity } from '../entities/user.entity';
import { QueueService } from '../queue/queue.service';
import { JobsFilterDto } from './dto/jobs-filter.dto';
import { JobsService } from './jobs.service';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly queueService: QueueService,
  ) {}

  @Get('stats')
  async getStats(@CurrentUser() user: UserEntity) {
    return this.jobsService.getJobStats(user);
  }

  @Get('history')
  async getJobHistory(
    @CurrentUser() user: UserEntity,
    @Query('manifestId') manifestId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedManifestId = this.parseOptionalNumber(manifestId);
    const parsedLimit = this.parseOptionalNumber(limit);
    return this.queueService.getJobHistory(
      user,
      parsedManifestId ?? undefined,
      parsedLimit ?? undefined,
    );
  }

  @Get()
  @CheckPolicies((ability) => ability.can(APP_ACTIONS.MANAGE, APP_SUBJECTS.QUEUE))
  async listJobs(@Query() filters: JobsFilterDto) {
    return this.jobsService.listJobs(filters);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can(APP_ACTIONS.MANAGE, APP_SUBJECTS.QUEUE))
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
