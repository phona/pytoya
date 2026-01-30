import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity, JobStatus } from '../entities/job.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ModelEntity } from '../entities/model.entity';
import {
  CostDashboardCostOverTimeDto,
  CostDashboardDto,
  CostDashboardLlmByModelDto,
  CostDashboardTextByExtractorDto,
  CostDashboardTotalsByCurrencyDto,
} from './dto/cost-dashboard.dto';

export interface CostAccuracyMetric {
  jobId: number;
  manifestId: number;
  estimatedCost: number;
  actualCost: number;
  accuracy: number; // percentage
  ocrEstimatedCost: number;
  ocrActualCost: number;
  llmEstimatedCost: number;
  llmActualCost: number;
  timestamp: Date;
}

export interface CostPerDocumentMetric {
  manifestId: number;
  filename: string;
  pageCount: number;
  ocrCost: number;
  ocrCostPerPage: number;
  llmCost: number;
  llmInputTokens: number;
  llmOutputTokens: number;
  llmCostPer1kTokens: number;
  totalCost: number;
  timestamp: Date;
}

export interface BudgetAlertMetric {
  userId: number;
  projectId: number;
  budget: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  alertLevel: 'warning' | 'critical' | 'exceeded';
  timestamp: Date;
}

export interface OcrCostPerPageMetric {
  ocrModelId: string;
  ocrModelName: string;
  totalPages: number;
  totalCost: number;
  averageCostPerPage: number;
  minCostPerPage: number;
  maxCostPerPage: number;
  period: string; // e.g., '2024-01'
}

export interface LlmCostPerTokenMetric {
  llmModelId: string;
  llmModelName: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  costPer1kTotalTokens: number;
  period: string; // e.g., '2024-01'
}

@Injectable()
export class CostMetricsService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
  ) {}

  private normalizeDecimal(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private normalizeCount(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private computeEndExclusive(to?: Date): Date | undefined {
    if (!to) {
      return undefined;
    }
    const endExclusive = new Date(to);
    endExclusive.setDate(endExclusive.getDate() + 1);
    return endExclusive;
  }

  async getCostDashboardMetrics(
    userId: number,
    from?: Date,
    to?: Date,
  ): Promise<CostDashboardDto> {
    const endExclusive = this.computeEndExclusive(to);

    const applyUserAndRange = (qb: any) => {
      qb.innerJoin('job.manifest', 'manifest')
        .innerJoin('manifest.group', 'group')
        .innerJoin('group.project', 'project')
        .where('project.ownerId = :userId', { userId });

      if (from) {
        qb.andWhere('job.createdAt >= :from', { from });
      }
      if (endExclusive) {
        qb.andWhere('job.createdAt < :endExclusive', { endExclusive });
      }

      return qb;
    };

    const currencyExpr = `COALESCE(job.costCurrency, 'unknown')`;
    const totalCostExpr = `COALESCE(job.actualCost, COALESCE(job.ocrActualCost, 0) + COALESCE(job.llmActualCost, 0))`;

    const totalsByCurrencyRows = await applyUserAndRange(
      this.jobRepository.createQueryBuilder('job'),
    )
      .select(currencyExpr, 'currency')
      .addSelect('COUNT(*)', 'documentCount')
      .addSelect(`COALESCE(SUM(${totalCostExpr}), 0)`, 'totalCost')
      .addSelect('COALESCE(SUM(job.ocrActualCost), 0)', 'textCost')
      .addSelect('COALESCE(SUM(job.llmActualCost), 0)', 'llmCost')
      .addSelect('COALESCE(SUM(job.pagesProcessed), 0)', 'pagesProcessed')
      .addSelect('COALESCE(SUM(job.llmInputTokens), 0)', 'llmInputTokens')
      .addSelect('COALESCE(SUM(job.llmOutputTokens), 0)', 'llmOutputTokens')
      .andWhere('job.status = :completed', { completed: JobStatus.COMPLETED })
      .groupBy(currencyExpr)
      .orderBy('currency', 'ASC')
      .getRawMany();

    const costOverTimeRows = await applyUserAndRange(
      this.jobRepository.createQueryBuilder('job'),
    )
      .select("TO_CHAR(job.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect(currencyExpr, 'currency')
      .addSelect('COUNT(*)', 'documentCount')
      .addSelect(`COALESCE(SUM(${totalCostExpr}), 0)`, 'totalCost')
      .addSelect('COALESCE(SUM(job.ocrActualCost), 0)', 'textCost')
      .addSelect('COALESCE(SUM(job.llmActualCost), 0)', 'llmCost')
      .addSelect('COALESCE(SUM(job.pagesProcessed), 0)', 'pagesProcessed')
      .addSelect('COALESCE(SUM(job.llmInputTokens), 0)', 'llmInputTokens')
      .addSelect('COALESCE(SUM(job.llmOutputTokens), 0)', 'llmOutputTokens')
      .andWhere('job.status = :completed', { completed: JobStatus.COMPLETED })
      .groupBy("TO_CHAR(job.createdAt, 'YYYY-MM-DD')")
      .addGroupBy(currencyExpr)
      .orderBy('date', 'ASC')
      .addOrderBy('currency', 'ASC')
      .getRawMany();

    const llmByModelRows = await applyUserAndRange(
      this.jobRepository.createQueryBuilder('job'),
    )
      .leftJoin(ModelEntity, 'llmModel', 'llmModel.id = job.llmModelId')
      .select('job.llmModelId', 'llmModelId')
      .addSelect('llmModel.name', 'llmModelName')
      .addSelect(currencyExpr, 'currency')
      .addSelect('COUNT(*)', 'documentCount')
      .addSelect('COALESCE(SUM(job.llmActualCost), 0)', 'llmCost')
      .addSelect('COALESCE(SUM(job.llmInputTokens), 0)', 'llmInputTokens')
      .addSelect('COALESCE(SUM(job.llmOutputTokens), 0)', 'llmOutputTokens')
      .andWhere('job.status = :completed', { completed: JobStatus.COMPLETED })
      .groupBy('job.llmModelId')
      .addGroupBy('llmModel.name')
      .addGroupBy(currencyExpr)
      // Avoid case-sensitive alias issues in Postgres ORDER BY ("llmCost" vs llmcost).
      .orderBy('COALESCE(SUM(job.llmActualCost), 0)', 'DESC')
      .getRawMany();

    const textByExtractorRows = await applyUserAndRange(
      this.jobRepository.createQueryBuilder('job'),
    )
      .leftJoin('manifest.textExtractor', 'extractor')
      .select('manifest.textExtractorId', 'extractorId')
      .addSelect('extractor.name', 'extractorName')
      .addSelect(currencyExpr, 'currency')
      .addSelect('COUNT(*)', 'documentCount')
      .addSelect('COALESCE(SUM(job.ocrActualCost), 0)', 'textCost')
      .addSelect('COALESCE(SUM(job.pagesProcessed), 0)', 'pagesProcessed')
      .andWhere('job.status = :completed', { completed: JobStatus.COMPLETED })
      .groupBy('manifest.textExtractorId')
      .addGroupBy('extractor.name')
      .addGroupBy(currencyExpr)
      // Avoid case-sensitive alias issues in Postgres ORDER BY ("textCost" vs textcost).
      .orderBy('COALESCE(SUM(job.ocrActualCost), 0)', 'DESC')
      .getRawMany();

    const totalsByCurrency: CostDashboardTotalsByCurrencyDto[] = totalsByCurrencyRows.map((row: any) => ({
      currency: String(row.currency),
      documentCount: this.normalizeCount(row.documentCount),
      totalCost: this.normalizeDecimal(row.totalCost),
      textCost: this.normalizeDecimal(row.textCost),
      llmCost: this.normalizeDecimal(row.llmCost),
      pagesProcessed: this.normalizeCount(row.pagesProcessed),
      llmInputTokens: this.normalizeCount(row.llmInputTokens),
      llmOutputTokens: this.normalizeCount(row.llmOutputTokens),
    }));

    const costOverTime: CostDashboardCostOverTimeDto[] = costOverTimeRows.map((row: any) => ({
      date: String(row.date),
      currency: String(row.currency),
      documentCount: this.normalizeCount(row.documentCount),
      totalCost: this.normalizeDecimal(row.totalCost),
      textCost: this.normalizeDecimal(row.textCost),
      llmCost: this.normalizeDecimal(row.llmCost),
      pagesProcessed: this.normalizeCount(row.pagesProcessed),
      llmInputTokens: this.normalizeCount(row.llmInputTokens),
      llmOutputTokens: this.normalizeCount(row.llmOutputTokens),
    }));

    const llmByModel: CostDashboardLlmByModelDto[] = llmByModelRows.map((row: any) => {
      const llmCost = this.normalizeDecimal(row.llmCost);
      const llmInputTokens = this.normalizeCount(row.llmInputTokens);
      const llmOutputTokens = this.normalizeCount(row.llmOutputTokens);
      const totalTokens = llmInputTokens + llmOutputTokens;
      return {
        llmModelId: row.llmModelId ? String(row.llmModelId) : null,
        llmModelName: row.llmModelName ? String(row.llmModelName) : null,
        currency: String(row.currency),
        documentCount: this.normalizeCount(row.documentCount),
        llmCost,
        llmInputTokens,
        llmOutputTokens,
        costPer1kTotalTokens: totalTokens > 0 ? (llmCost * 1000) / totalTokens : 0,
      };
    });

    const textByExtractor: CostDashboardTextByExtractorDto[] = textByExtractorRows.map((row: any) => {
      const textCost = this.normalizeDecimal(row.textCost);
      const pagesProcessed = this.normalizeCount(row.pagesProcessed);
      return {
        extractorId: row.extractorId ? String(row.extractorId) : null,
        extractorName: row.extractorName ? String(row.extractorName) : null,
        currency: String(row.currency),
        documentCount: this.normalizeCount(row.documentCount),
        textCost,
        pagesProcessed,
        costPerPage: pagesProcessed > 0 ? textCost / pagesProcessed : 0,
      };
    });

    const dateRange =
      from && to
        ? { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
        : undefined;

    return {
      ...(dateRange ? { dateRange } : {}),
      totalsByCurrency,
      costOverTime,
      llmByModel,
      textByExtractor,
    };
  }

  /**
   * Calculate cost accuracy: compare estimated vs actual costs
   */
  async calculateCostAccuracy(
    limit: number = 100,
  ): Promise<CostAccuracyMetric[]> {
    const jobs = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.actualCost IS NOT NULL')
      .andWhere('job.estimatedCost IS NOT NULL')
      .orderBy('job.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return jobs.map((job) => {
      const actualCost = this.normalizeDecimal(job.actualCost);
      const estimatedCost = this.normalizeDecimal(job.estimatedCost);
      const accuracy = estimatedCost
        ? ((1 - Math.abs(actualCost - estimatedCost) / estimatedCost) * 100)
        : 0;

      return {
        jobId: job.id,
        manifestId: job.manifestId,
        estimatedCost,
        actualCost,
        accuracy: Math.max(0, Math.min(100, accuracy)),
        ocrEstimatedCost: this.normalizeDecimal(job.ocrEstimatedCost),
        ocrActualCost: this.normalizeDecimal(job.ocrActualCost),
        llmEstimatedCost: this.normalizeDecimal(job.llmEstimatedCost),
        llmActualCost: this.normalizeDecimal(job.llmActualCost),
        timestamp: job.createdAt,
      };
    });
  }

  /**
   * Get cost per document trends with OCR vs LLM breakdown
   */
  async getCostPerDocumentTrends(
    userId: number,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<CostPerDocumentMetric[]> {
    const manifestQuery = this.manifestRepository
      .createQueryBuilder('manifest')
      .leftJoinAndSelect('manifest.group', 'group')
      .leftJoinAndSelect('group.project', 'project')
      .leftJoinAndSelect('project.owner', 'owner')
      .where('manifest.extractionCost IS NOT NULL')
      .andWhere('owner.id = :userId', { userId })
      .orderBy('manifest.createdAt', 'DESC')
      .take(limit);

    if (startDate) {
      manifestQuery.andWhere('manifest.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      manifestQuery.andWhere('manifest.createdAt <= :endDate', { endDate });
    }

    const userManifests = await manifestQuery.getMany();

    const manifestIds = userManifests.map((manifest) => manifest.id);
    const latestJobsByManifestId = new Map<number, JobEntity>();

    if (manifestIds.length > 0) {
      const jobs = await this.jobRepository
        .createQueryBuilder('job')
        .where('job.manifestId IN (:...manifestIds)', { manifestIds })
        .orderBy('job.manifestId', 'ASC')
        .addOrderBy('job.createdAt', 'DESC')
        .getMany();

      for (const job of jobs) {
        if (!latestJobsByManifestId.has(job.manifestId)) {
          latestJobsByManifestId.set(job.manifestId, job);
        }
      }
    }

    return userManifests.map((manifest) => {
      const job = latestJobsByManifestId.get(manifest.id);

        const ocrResult = manifest.ocrResult as any;
        const pageCount = ocrResult?.document?.pages || 1;
        const ocrCost = this.normalizeDecimal(job?.ocrActualCost);
        const llmCost = this.normalizeDecimal(job?.llmActualCost);
        const llmInputTokens = job?.llmInputTokens ?? 0;
        const llmOutputTokens = job?.llmOutputTokens ?? 0;

        return {
          manifestId: manifest.id,
          filename: manifest.filename,
          pageCount,
          ocrCost,
          ocrCostPerPage: pageCount > 0 ? ocrCost / pageCount : 0,
          llmCost,
          llmInputTokens,
          llmOutputTokens,
          llmCostPer1kTokens: (llmInputTokens + llmOutputTokens) > 0
            ? (llmCost / (llmInputTokens + llmOutputTokens)) * 1000
            : 0,
          totalCost: this.normalizeDecimal(manifest.extractionCost),
          timestamp: manifest.createdAt,
        };
    });
  }

  /**
   * Check budget alerting for users and projects
   */
  async checkBudgetAlerts(
    userId: number,
    projectId?: number,
  ): Promise<BudgetAlertMetric[]> {
    // Get user's budget settings (from config or user preferences)
    const userBudget = 100; // Default budget, should come from user settings

    // Calculate total spent this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const qb = this.jobRepository
      .createQueryBuilder('job')
      .leftJoin('job.manifest', 'manifest')
      .leftJoin('manifest.group', 'group')
      .leftJoin('group.project', 'project')
      .leftJoin('project.owner', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('job.createdAt >= :startOfMonth', { startOfMonth });

    if (projectId) {
      qb.andWhere('project.id = :projectId', { projectId });
    }

    const row = await qb
      .andWhere('job.actualCost IS NOT NULL')
      .select('COALESCE(SUM(job.actualCost), 0)', 'spent')
      .getRawOne<{ spent: unknown }>();

    const spent = this.normalizeDecimal(row?.spent);
    const remaining = userBudget - spent;
    const percentageUsed = (spent / userBudget) * 100;

    let alertLevel: 'warning' | 'critical' | 'exceeded' = 'warning';
    if (percentageUsed >= 100) {
      alertLevel = 'exceeded';
    } else if (percentageUsed >= 80) {
      alertLevel = 'critical';
    } else if (percentageUsed >= 50) {
      alertLevel = 'warning';
    }

    return [
      {
        userId,
        projectId: projectId || 0,
        budget: userBudget,
        spent,
        remaining: Math.max(0, remaining),
        percentageUsed,
        alertLevel,
        timestamp: new Date(),
      },
    ];
  }

  /**
   * Get OCR cost per page trends
   */
  async getOcrCostPerPageTrends(
    startDate: Date,
    endDate: Date,
  ): Promise<OcrCostPerPageMetric[]> {
    // Get OCR model IDs and names
    const ocrModels = await this.modelRepository.find({
      where: { adapterType: 'paddlex' },
      select: ['id', 'name'],
    });
    const ocrModelIds = ocrModels.map(m => m.id);
    const ocrModelMap = new Map(ocrModels.map(m => [m.id, m.name]));

    const jobs = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.modelId IN (:...modelIds)', { modelIds: ocrModelIds })
      .andWhere('job.createdAt >= :startDate', { startDate })
      .andWhere('job.createdAt <= :endDate', { endDate })
      .andWhere('job.ocrActualCost IS NOT NULL')
      .getMany();

    // Group by model
    const modelGroups = new Map<string, {
      modelName: string;
      pages: number;
      costs: number[];
    }>();

    for (const job of jobs) {
      const modelId = job.modelId || 'unknown';
      const modelName = ocrModelMap.get(modelId) || 'Unknown';

      if (!modelGroups.has(modelId)) {
        modelGroups.set(modelId, {
          modelName,
          pages: 0,
          costs: [],
        });
      }

      const group = modelGroups.get(modelId)!;
      group.pages += job.pagesProcessed || 1;
      group.costs.push(this.normalizeDecimal(job.ocrActualCost));
    }

    return Array.from(modelGroups.entries()).map(([modelId, data]) => {
      const totalCost = data.costs.reduce((sum, cost) => sum + cost, 0);
      const averageCostPerPage = data.pages > 0 ? totalCost / data.pages : 0;
      const minCostPerPage = data.costs.length > 0
        ? Math.min(...data.costs.map(c => c / (data.pages / data.costs.length)))
        : 0;
      const maxCostPerPage = data.costs.length > 0
        ? Math.max(...data.costs.map(c => c / (data.pages / data.costs.length)))
        : 0;

      return {
        ocrModelId: modelId,
        ocrModelName: data.modelName,
        totalPages: data.pages,
        totalCost,
        averageCostPerPage,
        minCostPerPage,
        maxCostPerPage,
        period: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
      };
    });
  }

  /**
   * Get LLM cost per token trends
   */
  async getLlmCostPerTokenTrends(
    startDate: Date,
    endDate: Date,
  ): Promise<LlmCostPerTokenMetric[]> {
    // Get LLM model IDs and names (non-paddlex)
    const llmModels = await this.modelRepository
      .createQueryBuilder('model')
      .where('model.adapterType != :adapterType', { adapterType: 'paddlex' })
      .select(['model.id', 'model.name'])
      .getMany();
    const llmModelIds = llmModels.map(m => m.id);
    const llmModelMap = new Map(llmModels.map(m => [m.id, m.name]));

    const jobs = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.modelId IN (:...modelIds)', { modelIds: llmModelIds })
      .andWhere('job.createdAt >= :startDate', { startDate })
      .andWhere('job.createdAt <= :endDate', { endDate })
      .andWhere('job.llmActualCost IS NOT NULL')
      .getMany();

    // Group by model
    const modelGroups = new Map<string, {
      modelName: string;
      inputTokens: number;
      outputTokens: number;
      costs: number[];
    }>();

    for (const job of jobs) {
      const modelId = job.modelId || 'unknown';
      const modelName = llmModelMap.get(modelId) || 'Unknown';

      if (!modelGroups.has(modelId)) {
        modelGroups.set(modelId, {
          modelName,
          inputTokens: 0,
          outputTokens: 0,
          costs: [],
        });
      }

      const group = modelGroups.get(modelId)!;
      group.inputTokens += job.llmInputTokens || 0;
      group.outputTokens += job.llmOutputTokens || 0;
      group.costs.push(this.normalizeDecimal(job.llmActualCost));
    }

    return Array.from(modelGroups.entries()).map(([modelId, data]) => {
      const totalInputTokens = data.inputTokens;
      const totalOutputTokens = data.outputTokens;
      const totalTokens = totalInputTokens + totalOutputTokens;
      const totalCost = data.costs.reduce((sum, cost) => sum + cost, 0);

      return {
        llmModelId: modelId,
        llmModelName: data.modelName,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        totalCost,
        costPer1kInputTokens: totalInputTokens > 0 ? (totalCost * 1000) / totalInputTokens : 0,
        costPer1kOutputTokens: totalOutputTokens > 0 ? (totalCost * 1000) / totalOutputTokens : 0,
        costPer1kTotalTokens: totalTokens > 0 ? (totalCost * 1000) / totalTokens : 0,
        period: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
      };
    });
  }

  /**
   * Get aggregated cost metrics for dashboard
   */
  async getAggregatedMetrics(userId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currencyExpr = `COALESCE(job.costCurrency, 'unknown')`;

    const fetchTotalsByCurrency = async (start: Date, endExclusive?: Date) => {
      const qb = this.jobRepository
        .createQueryBuilder('job')
        .select(currencyExpr, 'currency')
        .addSelect('COUNT(*)', 'documentCount')
        .addSelect('COALESCE(SUM(job.actualCost), 0)', 'total')
        .addSelect('COALESCE(SUM(job.ocrActualCost), 0)', 'ocr')
        .addSelect('COALESCE(SUM(job.llmActualCost), 0)', 'llm')
        .where('job.createdAt >= :start', { start })
        .andWhere('job.actualCost IS NOT NULL');

      if (endExclusive) {
        qb.andWhere('job.createdAt < :end', { end: endExclusive });
      }

      return qb
        .groupBy(currencyExpr)
        .orderBy('currency', 'ASC')
        .getRawMany<{
          currency: string;
          documentCount: unknown;
          total: unknown;
          ocr: unknown;
          llm: unknown;
        }>();
    };

    const [thisMonthRows, lastMonthRows, accuracy] = await Promise.all([
      fetchTotalsByCurrency(startOfMonth),
      fetchTotalsByCurrency(startOfLastMonth, startOfMonth),
      this.calculateCostAccuracy(50),
    ]);

    const normalizeTotals = (rows: Array<{ currency: string; documentCount: unknown; total: unknown; ocr: unknown; llm: unknown }>) =>
      rows.map((row) => ({
        currency: String(row.currency),
        documentCount: this.normalizeCount(row.documentCount),
        total: this.normalizeDecimal(row.total),
        ocr: this.normalizeDecimal(row.ocr),
        llm: this.normalizeDecimal(row.llm),
      }));

    const thisMonthTotalsByCurrency = normalizeTotals(thisMonthRows);
    const lastMonthTotalsByCurrency = normalizeTotals(lastMonthRows);

    const thisMonthDocumentCount = thisMonthTotalsByCurrency.reduce((sum, row) => sum + row.documentCount, 0);
    const lastMonthDocumentCount = lastMonthTotalsByCurrency.reduce((sum, row) => sum + row.documentCount, 0);

    const hasSingleCurrencyThisMonth = thisMonthTotalsByCurrency.length === 1;
    const hasSingleCurrencyLastMonth = lastMonthTotalsByCurrency.length === 1;

    const averageAccuracy =
      accuracy.length > 0
        ? accuracy.reduce((sum, metric) => sum + metric.accuracy, 0) / accuracy.length
        : 0;

    return {
      thisMonth: {
        total: hasSingleCurrencyThisMonth ? thisMonthTotalsByCurrency[0].total : null,
        ocr: hasSingleCurrencyThisMonth ? thisMonthTotalsByCurrency[0].ocr : null,
        llm: hasSingleCurrencyThisMonth ? thisMonthTotalsByCurrency[0].llm : null,
        documentCount: thisMonthDocumentCount,
        currency: hasSingleCurrencyThisMonth ? thisMonthTotalsByCurrency[0].currency : null,
        totalsByCurrency: thisMonthTotalsByCurrency.length > 1 ? thisMonthTotalsByCurrency : undefined,
      },
      lastMonth: {
        total: hasSingleCurrencyLastMonth ? lastMonthTotalsByCurrency[0].total : null,
        documentCount: lastMonthDocumentCount,
        currency: hasSingleCurrencyLastMonth ? lastMonthTotalsByCurrency[0].currency : null,
        totalsByCurrency: lastMonthTotalsByCurrency.length > 1 ? lastMonthTotalsByCurrency : undefined,
      },
      accuracy: {
        average: averageAccuracy,
        recent: accuracy.slice(0, 10),
      },
      budgetAlerts: await this.checkBudgetAlerts(userId),
    };
  }
}
