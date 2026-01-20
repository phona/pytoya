import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity } from '../entities/job.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ModelEntity } from '../entities/model.entity';

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

  /**
   * Calculate cost accuracy: compare estimated vs actual costs
   */
  async calculateCostAccuracy(
    limit: number = 100,
  ): Promise<CostAccuracyMetric[]> {
    const jobs = await this.jobRepository.find({
      where: {
        actualCost: { $ne: null } as any,
        estimatedCost: { $ne: null } as any,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return jobs.map((job) => {
      const actualCost = job.actualCost ?? 0;
      const estimatedCost = job.estimatedCost ?? 0;
      const accuracy = estimatedCost
        ? ((1 - Math.abs(actualCost - estimatedCost) / estimatedCost) * 100)
        : 0;

      return {
        jobId: job.id,
        manifestId: job.manifestId,
        estimatedCost,
        actualCost,
        accuracy: Math.max(0, Math.min(100, accuracy)),
        ocrEstimatedCost: job.ocrEstimatedCost ?? 0,
        ocrActualCost: job.ocrActualCost ?? 0,
        llmEstimatedCost: job.llmEstimatedCost ?? 0,
        llmActualCost: job.llmActualCost ?? 0,
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
    const manifests = await this.manifestRepository.find({
      where: {
        extractionCost: { $ne: null } as any,
        ...(startDate && { createdAt: { $gte: startDate } as any }),
        ...(endDate && { createdAt: { $lte: endDate } as any }),
      },
      relations: ['group', 'group.project', 'group.project.user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    // Filter by user's projects
    const userManifests = manifests.filter((m) =>
      m.group?.project?.owner?.id === userId,
    );

    return Promise.all(
      userManifests.map(async (manifest) => {
        const job = await this.jobRepository.findOne({
          where: { manifestId: manifest.id },
          order: { createdAt: 'DESC' },
        });

        const ocrResult = manifest.ocrResult as any;
        const pageCount = ocrResult?.document?.pages || 1;
        const ocrCost = job?.ocrActualCost ?? 0;
        const llmCost = job?.llmActualCost ?? 0;
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
          totalCost: manifest.extractionCost || 0,
          timestamp: manifest.createdAt,
        };
      }),
    );
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

    const jobs = await this.jobRepository
      .createQueryBuilder('job')
      .leftJoin('job.manifest', 'manifest')
      .leftJoin('manifest.group', 'group')
      .leftJoin('group.project', 'project')
      .leftJoin('project.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('job.createdAt >= :startOfMonth', { startOfMonth })
      .andWhere(projectId ? 'job.projectId = :projectId' : '1=1', { projectId })
      .getMany();

    const spent = jobs.reduce((sum, job) => sum + (job.actualCost || 0), 0);
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
      group.costs.push(job.ocrActualCost || 0);
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
      group.costs.push(job.llmActualCost || 0);
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

    const [thisMonthJobs, lastMonthJobs, accuracy] = await Promise.all([
      this.jobRepository.find({
        where: {
          createdAt: { $gte: startOfMonth } as any,
          actualCost: { $ne: null } as any,
        },
      }),
      this.jobRepository.find({
        where: {
          createdAt: {
            $gte: startOfLastMonth,
            $lt: startOfMonth,
          } as any,
          actualCost: { $ne: null } as any,
        },
      }),
      this.calculateCostAccuracy(50),
    ]);

    const thisMonthSpent = thisMonthJobs.reduce((sum, job) => sum + (job.actualCost || 0), 0);
    const lastMonthSpent = lastMonthJobs.reduce((sum, job) => sum + (job.actualCost || 0), 0);
    const averageAccuracy = accuracy.length > 0
      ? accuracy.reduce((sum, m) => sum + m.accuracy, 0) / accuracy.length
      : 0;

    const thisMonthOcrCost = thisMonthJobs.reduce((sum, job) => sum + (job.ocrActualCost || 0), 0);
    const thisMonthLlmCost = thisMonthJobs.reduce((sum, job) => sum + (job.llmActualCost || 0), 0);

    return {
      thisMonth: {
        total: thisMonthSpent,
        ocr: thisMonthOcrCost,
        llm: thisMonthLlmCost,
        documentCount: thisMonthJobs.length,
      },
      lastMonth: {
        total: lastMonthSpent,
        documentCount: lastMonthJobs.length,
      },
      accuracy: {
        average: averageAccuracy,
        recent: accuracy.slice(0, 10),
      },
      budgetAlerts: await this.checkBudgetAlerts(userId),
    };
  }
}
