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
import { ExtractionService } from './extraction.service';
import { OptimizePromptDto } from './dto/optimize-prompt.dto';
import { ReExtractDto } from './dto/re-extract.dto';

@UseGuards(JwtAuthGuard)
@Controller('extraction')
export class ExtractionController {
  constructor(
    private readonly manifestsService: ManifestsService,
    private readonly queueService: QueueService,
    private readonly extractionService: ExtractionService,
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
      body.llmModelId,
      body.promptId,
    );

    return { jobId };
  }

  @Post('optimize-prompt')
  async optimizePrompt(@Body() body: OptimizePromptDto) {
    return this.extractionService.optimizePrompt(body.description);
  }
}
