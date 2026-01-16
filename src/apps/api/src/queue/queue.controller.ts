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

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateJobDto } from './dto/create-job.dto';
import { QueueService } from './queue.service';

@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('extraction')
  async addExtractionJob(@Body() body: CreateJobDto) {
    const jobId = await this.queueService.addExtractionJob(
      body.manifestId,
      body.llmModelId,
      body.promptId,
    );

    return { jobId };
  }

  @Get('queue/stats')
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Post('queue/pause')
  async pauseQueue() {
    return this.queueService.pauseQueue();
  }

  @Post('queue/resume')
  async resumeQueue() {
    return this.queueService.resumeQueue();
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

  @Delete(':id')
  async removeJob(@Param('id') jobId: string) {
    await this.queueService.removeJob(jobId);
    return { removed: true };
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
