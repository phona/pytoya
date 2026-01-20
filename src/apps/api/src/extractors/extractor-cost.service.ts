import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ExtractorEntity } from '../entities/extractor.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ProjectEntity } from '../entities/project.entity';

@Injectable()
export class ExtractorCostService {
  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
  ) {}

  async getCostSummary(extractor: ExtractorEntity) {
    const totalRow = await this.manifestRepository
      .createQueryBuilder('manifest')
      .leftJoin('manifest.group', 'group')
      .leftJoin('group.project', 'project')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'total')
      .where('manifest.textExtractorId = :extractorId', { extractorId: extractor.id })
      .andWhere('manifest.extractionCost IS NOT NULL')
      .getRawOne<{ count: string; total: string }>();

    const totalExtractions = Number(totalRow?.count ?? 0);
    const totalCost = Number(totalRow?.total ?? 0);

    const byDate = await this.manifestRepository
      .createQueryBuilder('manifest')
      .select("TO_CHAR(manifest.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'cost')
      .where('manifest.textExtractorId = :extractorId', { extractorId: extractor.id })
      .andWhere('manifest.extractionCost IS NOT NULL')
      .groupBy("TO_CHAR(manifest.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: string; cost: string }>();

    const byProject = await this.manifestRepository
      .createQueryBuilder('manifest')
      .leftJoin('manifest.group', 'group')
      .leftJoin('group.project', 'project')
      .select('project.id', 'projectId')
      .addSelect('project.name', 'projectName')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'cost')
      .where('manifest.textExtractorId = :extractorId', { extractorId: extractor.id })
      .andWhere('manifest.extractionCost IS NOT NULL')
      .groupBy('project.id')
      .addGroupBy('project.name')
      .orderBy('project.name', 'ASC')
      .getRawMany<{ projectId: string; projectName: string; count: string; cost: string }>();

    return {
      extractorId: extractor.id,
      extractorName: extractor.name,
      totalExtractions,
      totalCost,
      averageCostPerExtraction: totalExtractions ? totalCost / totalExtractions : 0,
      currency: (extractor.config?.pricing as { currency?: string } | undefined)?.currency,
      costBreakdown: {
        byDate: byDate.map((row) => ({
          date: row.date,
          count: Number(row.count),
          cost: Number(row.cost),
        })),
        byProject: byProject.map((row) => ({
          projectId: Number(row.projectId),
          projectName: row.projectName,
          count: Number(row.count),
          cost: Number(row.cost),
        })),
      },
    };
  }
}
