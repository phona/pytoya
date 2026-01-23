import { BadRequestException, Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../entities/user.entity';
import { CostMetricsService } from './cost-metrics.service';

const parseDateOrThrow = (value: string, field: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} must be a valid date`);
  }
  return parsed;
};

@UseGuards(JwtAuthGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: CostMetricsService) {}

  @Get('cost-accuracy')
  async getCostAccuracy(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.metricsService.calculateCostAccuracy(limit);
  }

  @Get('cost-per-document')
  async getCostPerDocument(
    @CurrentUser() user: UserEntity,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.metricsService.getCostPerDocumentTrends(user.id, start, end, limit);
  }

  @Get('budget-alerts')
  async getBudgetAlerts(
    @CurrentUser() user: UserEntity,
    @Query('projectId', ParseIntPipe) projectId?: number,
  ) {
    return this.metricsService.checkBudgetAlerts(user.id, projectId);
  }

  @Get('ocr-cost-per-page')
  async getOcrCostPerPage(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.metricsService.getOcrCostPerPageTrends(start, end);
  }

  @Get('llm-cost-per-token')
  async getLlmCostPerToken(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.metricsService.getLlmCostPerTokenTrends(start, end);
  }

  @Get('dashboard')
  async getDashboardMetrics(@CurrentUser() user: UserEntity) {
    return this.metricsService.getAggregatedMetrics(user.id);
  }

  @Get('cost-dashboard')
  async getCostDashboardMetrics(
    @CurrentUser() user: UserEntity,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? parseDateOrThrow(from, 'from') : undefined;
    const toDate = to ? parseDateOrThrow(to, 'to') : undefined;
    return this.metricsService.getCostDashboardMetrics(user.id, fromDate, toDate);
  }
}
