import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ExtractorEntity } from '../entities/extractor.entity';
import { ManifestEntity } from '../entities/manifest.entity';

@Injectable()
export class ExtractorCostService {
  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
  ) {}

  async getCostSummary(extractor: ExtractorEntity) {
    const totalsByCurrencyRows = await this.manifestRepository
      .createQueryBuilder('manifest')
      .leftJoin('manifest.group', 'group')
      .leftJoin('group.project', 'project')
      .select(`COALESCE(manifest.extractionCostCurrency, 'unknown')`, 'currency')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'total')
      .where('manifest.textExtractorId = :extractorId', { extractorId: extractor.id })
      .andWhere('manifest.extractionCost IS NOT NULL')
      .groupBy(`COALESCE(manifest.extractionCostCurrency, 'unknown')`)
      .orderBy('currency', 'ASC')
      .getRawMany<{ currency: string; count: string; total: string }>();

    const totalsByCurrency = totalsByCurrencyRows.map((row) => {
      const totalExtractions = Number(row.count ?? 0);
      const totalCost = Number(row.total ?? 0);
      return {
        currency: row.currency,
        totalCost,
        totalExtractions,
        averageCostPerExtraction: totalExtractions ? totalCost / totalExtractions : 0,
      };
    });

    const totalExtractions = totalsByCurrency.reduce(
      (sum, entry) => sum + entry.totalExtractions,
      0,
    );

    const hasSingleCurrency = totalsByCurrency.length === 1;
    const totalCost = hasSingleCurrency ? totalsByCurrency[0].totalCost : null;
    const averageCostPerExtraction = hasSingleCurrency
      ? totalsByCurrency[0].averageCostPerExtraction
      : null;
    const currency = hasSingleCurrency ? totalsByCurrency[0].currency : null;

    const byDate = await this.manifestRepository
      .createQueryBuilder('manifest')
      .select("TO_CHAR(manifest.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect(`COALESCE(manifest.extractionCostCurrency, 'unknown')`, 'currency')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'cost')
      .where('manifest.textExtractorId = :extractorId', { extractorId: extractor.id })
      .andWhere('manifest.extractionCost IS NOT NULL')
      .groupBy("TO_CHAR(manifest.createdAt, 'YYYY-MM-DD')")
      .addGroupBy(`COALESCE(manifest.extractionCostCurrency, 'unknown')`)
      .orderBy('date', 'ASC')
      .addOrderBy('currency', 'ASC')
      .getRawMany<{ date: string; currency: string; count: string; cost: string }>();

    const byProject = await this.manifestRepository
      .createQueryBuilder('manifest')
      .leftJoin('manifest.group', 'group')
      .leftJoin('group.project', 'project')
      .select('project.id', 'projectId')
      .addSelect('project.name', 'projectName')
      .addSelect(`COALESCE(manifest.extractionCostCurrency, 'unknown')`, 'currency')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'cost')
      .where('manifest.textExtractorId = :extractorId', { extractorId: extractor.id })
      .andWhere('manifest.extractionCost IS NOT NULL')
      .groupBy('project.id')
      .addGroupBy('project.name')
      .addGroupBy(`COALESCE(manifest.extractionCostCurrency, 'unknown')`)
      .orderBy('project.name', 'ASC')
      .addOrderBy('currency', 'ASC')
      .getRawMany<{ projectId: string; projectName: string; currency: string; count: string; cost: string }>();

    return {
      extractorId: extractor.id,
      extractorName: extractor.name,
      totalExtractions,
      totalCost,
      averageCostPerExtraction,
      currency,
      totalsByCurrency: totalsByCurrency.length > 1 ? totalsByCurrency : undefined,
      costBreakdown: {
        byDate: byDate.map((row) => ({
          date: row.date,
          currency: row.currency,
          count: Number(row.count),
          cost: Number(row.cost),
        })),
        byProject: byProject.map((row) => ({
          projectId: Number(row.projectId),
          projectName: row.projectName,
          currency: row.currency,
          count: Number(row.count),
          cost: Number(row.cost),
        })),
      },
    };
  }

  async getCostSummaries(extractors: ExtractorEntity[]) {
    const extractorIds = extractors.map((extractor) => extractor.id);
    const namesById = extractors.reduce<Record<string, string>>((acc, extractor) => {
      acc[extractor.id] = extractor.name;
      return acc;
    }, {});

    if (extractorIds.length === 0) {
      return [];
    }

    const currencyExpr = `COALESCE(manifest.extractionCostCurrency, 'unknown')`;

    const totalsByCurrencyRows = await this.manifestRepository
      .createQueryBuilder('manifest')
      .select('manifest.textExtractorId', 'extractorId')
      .addSelect(currencyExpr, 'currency')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'total')
      .where('manifest.textExtractorId IN (:...extractorIds)', { extractorIds })
      .andWhere('manifest.extractionCost IS NOT NULL')
      .groupBy('manifest.textExtractorId')
      .addGroupBy(currencyExpr)
      .orderBy('extractorId', 'ASC')
      .addOrderBy('currency', 'ASC')
      .getRawMany<{ extractorId: string; currency: string; count: string; total: string }>();

    const byDateRows = await this.manifestRepository
      .createQueryBuilder('manifest')
      .select('manifest.textExtractorId', 'extractorId')
      .addSelect("TO_CHAR(manifest.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect(currencyExpr, 'currency')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'cost')
      .where('manifest.textExtractorId IN (:...extractorIds)', { extractorIds })
      .andWhere('manifest.extractionCost IS NOT NULL')
      .groupBy('manifest.textExtractorId')
      .addGroupBy("TO_CHAR(manifest.createdAt, 'YYYY-MM-DD')")
      .addGroupBy(currencyExpr)
      .orderBy('date', 'ASC')
      .addOrderBy('currency', 'ASC')
      .getRawMany<{ extractorId: string; date: string; currency: string; count: string; cost: string }>();

    const byProjectRows = await this.manifestRepository
      .createQueryBuilder('manifest')
      .leftJoin('manifest.group', 'group')
      .leftJoin('group.project', 'project')
      .select('manifest.textExtractorId', 'extractorId')
      .addSelect('project.id', 'projectId')
      .addSelect('project.name', 'projectName')
      .addSelect(currencyExpr, 'currency')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(manifest.extractionCost), 0)', 'cost')
      .where('manifest.textExtractorId IN (:...extractorIds)', { extractorIds })
      .andWhere('manifest.extractionCost IS NOT NULL')
      .groupBy('manifest.textExtractorId')
      .addGroupBy('project.id')
      .addGroupBy('project.name')
      .addGroupBy(currencyExpr)
      .orderBy('project.name', 'ASC')
      .addOrderBy('currency', 'ASC')
      .getRawMany<{ extractorId: string; projectId: string; projectName: string; currency: string; count: string; cost: string }>();

    const totalsByExtractor = totalsByCurrencyRows.reduce<Record<string, Array<{ currency: string; count: number; total: number }>>>((acc, row) => {
      const list = acc[row.extractorId] ?? [];
      list.push({
        currency: row.currency,
        count: Number(row.count ?? 0),
        total: Number(row.total ?? 0),
      });
      acc[row.extractorId] = list;
      return acc;
    }, {});

    const byDateByExtractor = byDateRows.reduce<Record<string, Array<{ date: string; currency: string; count: number; cost: number }>>>((acc, row) => {
      const list = acc[row.extractorId] ?? [];
      list.push({
        date: row.date,
        currency: row.currency,
        count: Number(row.count ?? 0),
        cost: Number(row.cost ?? 0),
      });
      acc[row.extractorId] = list;
      return acc;
    }, {});

    const byProjectByExtractor = byProjectRows.reduce<Record<string, Array<{ projectId: number; projectName: string; currency: string; count: number; cost: number }>>>((acc, row) => {
      const list = acc[row.extractorId] ?? [];
      list.push({
        projectId: Number(row.projectId),
        projectName: row.projectName,
        currency: row.currency,
        count: Number(row.count ?? 0),
        cost: Number(row.cost ?? 0),
      });
      acc[row.extractorId] = list;
      return acc;
    }, {});

    return extractorIds.map((extractorId) => {
      const totals = totalsByExtractor[extractorId] ?? [];
      const totalsByCurrency = totals.map((entry) => {
        const totalExtractions = entry.count;
        const totalCost = entry.total;
        return {
          currency: entry.currency,
          totalCost,
          totalExtractions,
          averageCostPerExtraction: totalExtractions ? totalCost / totalExtractions : 0,
        };
      });

      const totalExtractions = totalsByCurrency.reduce((sum, entry) => sum + entry.totalExtractions, 0);
      const hasSingleCurrency = totalsByCurrency.length === 1;
      const totalCost = hasSingleCurrency ? totalsByCurrency[0].totalCost : null;
      const averageCostPerExtraction = hasSingleCurrency ? totalsByCurrency[0].averageCostPerExtraction : null;
      const currency = hasSingleCurrency ? totalsByCurrency[0].currency : null;

      const byDate = byDateByExtractor[extractorId] ?? [];
      const byProject = byProjectByExtractor[extractorId] ?? [];

      return {
        extractorId,
        extractorName: namesById[extractorId] ?? extractorId,
        totalExtractions,
        totalCost,
        averageCostPerExtraction,
        currency,
        totalsByCurrency: totalsByCurrency.length > 1 ? totalsByCurrency : undefined,
        costBreakdown: {
          byDate,
          byProject,
        },
      };
    });
  }
}
