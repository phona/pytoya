import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserEntity } from '../entities/user.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { CancelJobDto } from './dto/cancel-job.dto';
import { QueueService } from './queue.service';
import { CheckPolicies } from '../auth/casl/check-policies.decorator';
import { APP_ACTIONS, APP_SUBJECTS } from '../auth/casl/casl.types';
import { PoliciesGuard } from '../auth/casl/policies.guard';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('jobs')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('extraction')
  @CheckPolicies((ability) => ability.can(APP_ACTIONS.MANAGE, APP_SUBJECTS.QUEUE))
  async addExtractionJob(@Body() body: CreateJobDto) {
    const jobId = await this.queueService.addExtractionJob(
      body.manifestId,
      body.llmModelId,
      body.promptId,
    );

    return { jobId };
  }

  @Get('queue/stats')
  @CheckPolicies((ability) => ability.can(APP_ACTIONS.MANAGE, APP_SUBJECTS.QUEUE))
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Post('queue/pause')
  @CheckPolicies((ability) => ability.can(APP_ACTIONS.MANAGE, APP_SUBJECTS.QUEUE))
  async pauseQueue() {
    return this.queueService.pauseQueue();
  }

  @Post('queue/resume')
  @CheckPolicies((ability) => ability.can(APP_ACTIONS.MANAGE, APP_SUBJECTS.QUEUE))
  async resumeQueue() {
    return this.queueService.resumeQueue();
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(APP_ACTIONS.MANAGE, APP_SUBJECTS.QUEUE))
  async removeJob(@Param('id') jobId: string) {
    await this.queueService.removeJob(jobId);
    return { removed: true };
  }

  @Post(':id/cancel')
  async cancelJob(
    @CurrentUser() user: UserEntity,
    @Param('id') jobId: string,
    @Body() body: CancelJobDto,
  ) {
    return this.queueService.requestCancelJob(user, jobId, body.reason);
  }
}
