import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ManifestEntity, ManifestStatus } from '../entities/manifest.entity';
import { OperationLogEntity } from '../entities/operation-log.entity';
import { UserEntity } from '../entities/user.entity';
import {
  AnalyticsRecommendationDto,
  AnalyticsRecommendationsResponseDto,
  RecommendationSeverity,
} from './dto/analytics-recommendations.dto';
import { ProjectsService } from './projects.service';

const SEVERITY_ORDER: Record<RecommendationSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export const OCR_QUALITY_THRESHOLDS = {
  minScored: 5,
  poorShare: 0.25,
} as const;

export const FIELD_CORRECTION_THRESHOLDS = {
  minManifests: 5,
  topN: 3,
} as const;

export const MODEL_FAILURE_THRESHOLDS = {
  minTerminal: 10,
  failedShare: 0.1,
} as const;

export const BACKLOG_THRESHOLDS = {
  ageDays: 7,
  minCount: 5,
} as const;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AnalyticsRecommendationsService {
  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    @InjectRepository(OperationLogEntity)
    private readonly operationLogRepository: Repository<OperationLogEntity>,
    private readonly projectsService: ProjectsService,
  ) {}

  async getRecommendations(
    user: UserEntity,
    projectId: number,
  ): Promise<AnalyticsRecommendationsResponseDto> {
    await this.projectsService.findOne(user, projectId);

    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    const [ocr, fieldCorrections, modelFailure, backlog] = await Promise.all([
      this.buildOcrQualityRecommendation(projectId, since),
      this.buildFieldCorrectionRecommendations(projectId, since),
      this.buildModelFailureRecommendation(projectId, since),
      this.buildBacklogRecommendation(projectId),
    ]);

    const recommendations = [
      ocr,
      ...fieldCorrections,
      modelFailure,
      backlog,
    ].filter((r): r is AnalyticsRecommendationDto => r !== null);

    recommendations.sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );

    return {
      generatedAt: new Date().toISOString(),
      recommendations,
    };
  }

  private async buildOcrQualityRecommendation(
    projectId: number,
    since: Date,
  ): Promise<AnalyticsRecommendationDto | null> {
    const row = await this.manifestRepository
      .createQueryBuilder('manifest')
      .innerJoin('manifest.group', 'group')
      .where('group.projectId = :projectId', { projectId })
      .andWhere('manifest.createdAt >= :since', { since })
      .andWhere('manifest.ocrQualityScore IS NOT NULL')
      .select('COUNT(*)', 'scored')
      .addSelect(
        `SUM(CASE WHEN manifest.ocrQualityScore < 70 THEN 1 ELSE 0 END)`,
        'poor',
      )
      .getRawOne<{ scored: string; poor: string }>();

    const scored = Number(row?.scored ?? 0);
    const poor = Number(row?.poor ?? 0);
    if (scored < OCR_QUALITY_THRESHOLDS.minScored) {
      return null;
    }
    const share = poor / scored;
    if (share <= OCR_QUALITY_THRESHOLDS.poorShare) {
      return null;
    }

    const percent = Math.round(share * 100);

    return {
      id: 'ocr-quality-low',
      severity: share >= 0.5 ? 'critical' : 'warning',
      titleKey: 'analytics.recommendations.ocrQuality.title',
      titleVars: { percent },
      evidence: [
        {
          labelKey: 'analytics.recommendations.ocrQuality.evidence.poorShare',
          labelVars: { poor, scored },
          value: `${percent}%`,
        },
      ],
      actionHref: `/projects/${projectId}/settings/extractors`,
      actionLabelKey: 'analytics.recommendations.action.editExtractor',
    };
  }

  private async buildFieldCorrectionRecommendations(
    projectId: number,
    since: Date,
  ): Promise<AnalyticsRecommendationDto[]> {
    const logs = await this.operationLogRepository
      .createQueryBuilder('log')
      .innerJoin('log.manifest', 'manifest')
      .innerJoin('manifest.group', 'group')
      .where('group.projectId = :projectId', { projectId })
      .andWhere('log.createdAt >= :since', { since })
      .select('log.diffs', 'diffs')
      .addSelect('log.manifestId', 'manifestId')
      .getRawMany<{ diffs: unknown; manifestId: number }>();

    const perPath = new Map<string, Set<number>>();
    for (const row of logs) {
      const diffs = Array.isArray(row.diffs)
        ? (row.diffs as Array<{ path?: unknown }>)
        : [];
      for (const diff of diffs) {
        if (typeof diff?.path !== 'string' || diff.path.length === 0) {
          continue;
        }
        if (!perPath.has(diff.path)) {
          perPath.set(diff.path, new Set());
        }
        perPath.get(diff.path)!.add(row.manifestId);
      }
    }

    const ranked = Array.from(perPath.entries())
      .map(([path, set]) => ({ path, count: set.size }))
      .filter((entry) => entry.count >= FIELD_CORRECTION_THRESHOLDS.minManifests)
      .sort((a, b) => b.count - a.count)
      .slice(0, FIELD_CORRECTION_THRESHOLDS.topN);

    return ranked.map((entry) => ({
      id: `field-correction-${entry.path}`,
      severity: entry.count >= 15 ? 'warning' : 'info',
      titleKey: 'analytics.recommendations.fieldCorrection.title',
      titleVars: { path: entry.path, count: entry.count },
      evidence: [
        {
          labelKey:
            'analytics.recommendations.fieldCorrection.evidence.manifests',
          labelVars: { count: entry.count },
          value: String(entry.count),
        },
      ],
      actionHref: `/projects/${projectId}/settings/rules`,
      actionLabelKey: 'analytics.recommendations.action.editRules',
    }));
  }

  private async buildModelFailureRecommendation(
    projectId: number,
    since: Date,
  ): Promise<AnalyticsRecommendationDto | null> {
    const row = await this.manifestRepository
      .createQueryBuilder('manifest')
      .innerJoin('manifest.group', 'group')
      .where('group.projectId = :projectId', { projectId })
      .andWhere('manifest.createdAt >= :since', { since })
      .andWhere('manifest.status IN (:...terminal)', {
        terminal: [
          ManifestStatus.COMPLETED,
          ManifestStatus.PARTIAL,
          ManifestStatus.FAILED,
        ],
      })
      .select('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN manifest.status = :failed THEN 1 ELSE 0 END)`,
        'failed',
      )
      .setParameter('failed', ManifestStatus.FAILED)
      .getRawOne<{ total: string; failed: string }>();

    const total = Number(row?.total ?? 0);
    const failed = Number(row?.failed ?? 0);
    if (total < MODEL_FAILURE_THRESHOLDS.minTerminal) {
      return null;
    }
    const share = failed / total;
    if (share <= MODEL_FAILURE_THRESHOLDS.failedShare) {
      return null;
    }

    const percent = Math.round(share * 100);

    return {
      id: 'model-failure-rate-high',
      severity: share >= 0.25 ? 'critical' : 'warning',
      titleKey: 'analytics.recommendations.modelFailure.title',
      titleVars: { percent },
      evidence: [
        {
          labelKey:
            'analytics.recommendations.modelFailure.evidence.failedShare',
          labelVars: { failed, total },
          value: `${percent}%`,
        },
      ],
      actionHref: `/projects/${projectId}/settings/models`,
      actionLabelKey: 'analytics.recommendations.action.editModels',
    };
  }

  private async buildBacklogRecommendation(
    projectId: number,
  ): Promise<AnalyticsRecommendationDto | null> {
    const cutoff = new Date(
      Date.now() - BACKLOG_THRESHOLDS.ageDays * 24 * 60 * 60 * 1000,
    );

    const row = await this.manifestRepository
      .createQueryBuilder('manifest')
      .innerJoin('manifest.group', 'group')
      .where('group.projectId = :projectId', { projectId })
      .andWhere('manifest.status IN (:...stuck)', {
        stuck: [ManifestStatus.PENDING, ManifestStatus.PARTIAL],
      })
      .andWhere('manifest.createdAt <= :cutoff', { cutoff })
      .select('COUNT(*)', 'count')
      .getRawOne<{ count: string }>();

    const count = Number(row?.count ?? 0);
    if (count < BACKLOG_THRESHOLDS.minCount) {
      return null;
    }

    return {
      id: 'backlog-stale-manifests',
      severity: count >= 20 ? 'warning' : 'info',
      titleKey: 'analytics.recommendations.backlog.title',
      titleVars: { count, days: BACKLOG_THRESHOLDS.ageDays },
      evidence: [
        {
          labelKey: 'analytics.recommendations.backlog.evidence.count',
          labelVars: { count, days: BACKLOG_THRESHOLDS.ageDays },
          value: String(count),
        },
      ],
      actionHref: `/projects/${projectId}`,
      actionLabelKey: 'analytics.recommendations.action.viewManifests',
    };
  }
}
