import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserEntity } from '../entities/user.entity';
import { ManifestsService } from '../manifests/manifests.service';
import { QueueService } from '../queue/queue.service';
import { ReExtractDto } from './dto/re-extract.dto';

@UseGuards(JwtAuthGuard)
@Controller('extraction')
export class ExtractionController {
  constructor(
    private readonly manifestsService: ManifestsService,
    private readonly queueService: QueueService,
  ) {}

  @Post('re-extract/:manifestId')
  async reExtract(
    @CurrentUser() user: UserEntity,
    @Param('manifestId', ParseIntPipe) manifestId: number,
    @Body() body: ReExtractDto,
  ) {
    await this.manifestsService.findOne(user, manifestId);
    const jobId = await this.queueService.addExtractionJob(
      manifestId,
      body.providerId,
      body.promptId,
    );

    return { jobId };
  }
}
