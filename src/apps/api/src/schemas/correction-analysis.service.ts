import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OperationLogEntity, FieldDiff } from '../entities/operation-log.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { SchemaEntity } from '../entities/schema.entity';
import type {
  CorrectionAnalysisResult,
  CorrectedFieldSummary,
  CorrectionExample,
  CorrectionSuggestion,
  OcrConfusion,
} from './dto/correction-analysis.dto';
import type { OcrDomainHints } from '../prompts/types/prompts.types';

@Injectable()
export class CorrectionAnalysisService {
  constructor(
    @InjectRepository(OperationLogEntity)
    private readonly operationLogRepo: Repository<OperationLogEntity>,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepo: Repository<ManifestEntity>,
    @InjectRepository(SchemaEntity)
    private readonly schemaRepo: Repository<SchemaEntity>,
  ) {}

  async aggregateCorrections(
    schemaId: number,
    options: { since?: Date; limit?: number } = {},
  ): Promise<CorrectionAnalysisResult> {
    const limit = Math.min(options.limit ?? 500, 2000);

    // Find all manifest IDs under this schema's project's groups
    const manifestIds = await this.getManifestIdsForSchema(schemaId);
    if (manifestIds.length === 0) {
      return this.emptyResult();
    }

    // Query operation logs for these manifests
    const qb = this.operationLogRepo
      .createQueryBuilder('log')
      .where('log.manifest_id IN (:...manifestIds)', { manifestIds })
      .andWhere('log.action = :action', { action: 'manual_edit' })
      .orderBy('log.created_at', 'DESC')
      .take(limit);

    if (options.since) {
      qb.andWhere('log.created_at >= :since', { since: options.since });
    }

    const logs = await qb.getMany();
    if (logs.length === 0) {
      return this.emptyResult();
    }

    return this.analyzeLogs(logs);
  }

  buildAnalysisPrompt(analysis: CorrectionAnalysisResult): string {
    const lines: string[] = [];

    lines.push(
      `Based on analysis of ${analysis.totalLogs} human corrections ` +
      `(${analysis.totalDiffs} field changes) across ` +
      `${analysis.summary.manifestsWithCorrections} documents:`,
    );
    lines.push('');

    if (analysis.topCorrectedFields.length > 0) {
      lines.push('## Most Frequently Corrected Fields');
      lines.push('');
      for (const field of analysis.topCorrectedFields.slice(0, 15)) {
        // Normalize array indices to wildcards for readability
        const displayPath = field.path.replace(/\.\d+\./g, '.*.');
        lines.push(`### \`${displayPath}\` (${field.count} corrections)`);
        for (const ex of field.examples.slice(0, 5)) {
          const before = this.formatValue(ex.before);
          const after = this.formatValue(ex.after);
          const suffix = ex.count > 1 ? ` (×${ex.count})` : '';
          lines.push(`- ${before} → ${after}${suffix}`);
        }
        lines.push('');
      }
    }

    if (analysis.ocrConfusions.length > 0) {
      lines.push('## Detected OCR Character Confusions');
      lines.push('');
      lines.push('| from | to | occurrences | typical context |');
      lines.push('|------|-----|-------------|-----------------|');
      for (const c of analysis.ocrConfusions.slice(0, 20)) {
        const ctx = c.contexts.slice(0, 3).join(', ');
        lines.push(`| ${c.from} | ${c.to} | ${c.count} | ${ctx} |`);
      }
      lines.push('');
    }

    lines.push('Please update the Prompt Rules to address these recurring correction patterns.');
    lines.push('Focus on adding OCR correction mappings and field-specific extraction rules.');

    return lines.join('\n');
  }

  async getCorrectionSummary(
    schemaId: number,
    since?: Date,
  ): Promise<{
    totalCorrections: number;
    uniqueFieldsCorrected: number;
    manifestsAffected: number;
    hasNewPatterns: boolean;
  }> {
    const schema = await this.schemaRepo.findOneOrFail({ where: { id: schemaId } });

    const manifestIds = await this.getManifestIdsForSchema(schemaId);
    if (manifestIds.length === 0) {
      return { totalCorrections: 0, uniqueFieldsCorrected: 0, manifestsAffected: 0, hasNewPatterns: false };
    }

    const qb = this.operationLogRepo
      .createQueryBuilder('log')
      .where('log.manifest_id IN (:...manifestIds)', { manifestIds })
      .andWhere('log.action = :action', { action: 'manual_edit' });

    if (since) {
      qb.andWhere('log.created_at >= :since', { since });
    }

    const logs = await qb.getMany();

    const uniqueFields = new Set<string>();
    const uniqueManifests = new Set<number>();
    let hasNewPatterns = false;

    for (const log of logs) {
      uniqueManifests.add(log.manifestId);
      const diffs = log.diffs as Array<{ path: string }>;
      if (Array.isArray(diffs)) {
        for (const diff of diffs) {
          uniqueFields.add(diff.path);
        }
      }
      if (log.createdAt > schema.updatedAt) {
        hasNewPatterns = true;
      }
    }

    return {
      totalCorrections: logs.length,
      uniqueFieldsCorrected: uniqueFields.size,
      manifestsAffected: uniqueManifests.size,
      hasNewPatterns,
    };
  }

  async suggestRuleUpdates(
    schemaId: number,
    threshold: number = 3,
  ): Promise<CorrectionSuggestion[]> {
    const analysis = await this.aggregateCorrections(schemaId);
    if (analysis.totalLogs === 0) {
      return [];
    }

    const suggestions: CorrectionSuggestion[] = [];
    for (const field of analysis.topCorrectedFields) {
      if (field.count < threshold) continue;

      const patterns = field.examples
        .filter((ex) => ex.count >= 2)
        .map((ex) => ({
          before: this.formatValue(ex.before),
          after: this.formatValue(ex.after),
          count: ex.count,
        }));

      if (patterns.length === 0) continue;

      const displayPath = field.path.replace(/\.\d+\./g, '.*.').replace(/\.\d+$/, '.*');
      const topPattern = patterns[0];
      const suggestedRule = `When extracting \`${displayPath}\`, correct ${topPattern.before} to ${topPattern.after}`;

      suggestions.push({
        fieldPath: displayPath,
        correctionCount: field.count,
        patterns,
        suggestedRule,
      });
    }

    return suggestions;
  }

  async generateDomainHints(
    schemaId: number,
    threshold: number = 3,
  ): Promise<OcrDomainHints> {
    const analysis = await this.aggregateCorrections(schemaId);
    const hints: OcrDomainHints = {};

    // Extract known OCR confusions (character-level swaps that occur >= threshold times)
    if (analysis.ocrConfusions.length > 0) {
      hints.knownConfusions = analysis.ocrConfusions
        .filter((c) => c.count >= threshold)
        .slice(0, 20)
        .map((c) => ({
          from: c.from,
          to: c.to,
          context: c.contexts.slice(0, 2).join(', ') || undefined,
        }));
    }

    // Extract field-specific hints from top corrected fields
    if (analysis.topCorrectedFields.length > 0) {
      const fieldHints: Array<{ field: string; hint: string }> = [];

      for (const field of analysis.topCorrectedFields) {
        if (field.count < threshold) continue;

        const displayPath = field.path.replace(/\.\d+\./g, '.*.').replace(/\.\d+$/, '.*');
        // Skip if already added (different array indices map to same wildcard path)
        if (fieldHints.some((fh) => fh.field === displayPath)) continue;

        const topPatterns = field.examples
          .filter((ex) => ex.count >= 2)
          .slice(0, 3)
          .map((ex) => `${this.formatValue(ex.before)}→${this.formatValue(ex.after)}`);

        if (topPatterns.length > 0) {
          fieldHints.push({
            field: displayPath,
            hint: `Common corrections: ${topPatterns.join(', ')}`,
          });
        }
      }

      if (fieldHints.length > 0) {
        hints.fieldHints = fieldHints.slice(0, 10);
      }
    }

    return hints;
  }

  // --- Private helpers ---

  private async getManifestIdsForSchema(schemaId: number): Promise<number[]> {
    // schema → project → groups → manifests
    const rows = await this.manifestRepo
      .createQueryBuilder('m')
      .select('m.id')
      .innerJoin('m.group', 'g')
      .innerJoin('g.project', 'p')
      .innerJoin('p.schemas', 's', 's.id = :schemaId', { schemaId })
      .getMany();

    return rows.map((r) => r.id);
  }

  private analyzeLogs(logs: OperationLogEntity[]): CorrectionAnalysisResult {
    const manifestIdSet = new Set<number>();
    const fieldCounts = new Map<string, number>();
    const fieldExamples = new Map<string, Map<string, { before: unknown; after: unknown; count: number }>>();
    let totalDiffs = 0;

    for (const log of logs) {
      manifestIdSet.add(log.manifestId);
      for (const diff of log.diffs) {
        totalDiffs++;
        const path = diff.path;
        fieldCounts.set(path, (fieldCounts.get(path) ?? 0) + 1);

        if (!fieldExamples.has(path)) {
          fieldExamples.set(path, new Map());
        }
        const examplesMap = fieldExamples.get(path)!;
        const key = JSON.stringify([diff.before, diff.after]);
        const existing = examplesMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          examplesMap.set(key, { before: diff.before, after: diff.after, count: 1 });
        }
      }
    }

    // Sort fields by correction count descending
    const sortedFields = [...fieldCounts.entries()]
      .sort((a, b) => b[1] - a[1]);

    const topCorrectedFields: CorrectedFieldSummary[] = sortedFields
      .slice(0, 20)
      .map(([path, count]) => {
        const examplesMap = fieldExamples.get(path)!;
        const examples: CorrectionExample[] = [...examplesMap.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        return { path, count, examples };
      });

    // Detect OCR character confusions
    const ocrConfusions = this.detectOcrConfusions(logs);

    // Date range
    const dates = logs.map((l) => l.createdAt);
    const from = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString() : null;
    const to = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString() : null;

    return {
      totalLogs: logs.length,
      totalDiffs,
      dateRange: { from, to },
      topCorrectedFields,
      ocrConfusions,
      summary: {
        manifestsWithCorrections: manifestIdSet.size,
        uniqueFieldsCorrected: fieldCounts.size,
        avgDiffsPerLog: logs.length > 0 ? Math.round((totalDiffs / logs.length) * 10) / 10 : 0,
      },
    };
  }

  private detectOcrConfusions(logs: OperationLogEntity[]): OcrConfusion[] {
    // Track single-character substitutions in string diffs
    const confusionMap = new Map<string, { count: number; contexts: Set<string> }>();

    for (const log of logs) {
      for (const diff of log.diffs) {
        if (typeof diff.before !== 'string' || typeof diff.after !== 'string') continue;
        const charSwaps = this.findCharSubstitutions(diff.before, diff.after);
        for (const [from, to] of charSwaps) {
          const key = `${from}→${to}`;
          const existing = confusionMap.get(key);
          if (existing) {
            existing.count++;
            existing.contexts.add(this.normalizePathForContext(diff.path));
          } else {
            confusionMap.set(key, { count: 1, contexts: new Set([this.normalizePathForContext(diff.path)]) });
          }
        }
      }
    }

    return [...confusionMap.entries()]
      .map(([key, { count, contexts }]) => {
        const [from, to] = key.split('→');
        return { from, to, count, contexts: [...contexts] };
      })
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Find single-character substitutions between two strings of equal length.
   * Only considers strings that differ in a small number of positions.
   */
  private findCharSubstitutions(before: string, after: string): Array<[string, string]> {
    if (before.length !== after.length) return [];
    if (before.length > 100) return []; // Skip very long strings

    const swaps: Array<[string, string]> = [];
    let diffCount = 0;
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) {
        diffCount++;
        if (diffCount > 5) return []; // Too many differences — not OCR confusion
        swaps.push([before[i], after[i]]);
      }
    }
    return swaps;
  }

  private normalizePathForContext(path: string): string {
    // items.0.unitPrice → items.*.unitPrice
    return path.replace(/\.\d+\./g, '.*.').replace(/\.\d+$/, '.*');
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'string') return `"${value}"`;
    return JSON.stringify(value);
  }

  private emptyResult(): CorrectionAnalysisResult {
    return {
      totalLogs: 0,
      totalDiffs: 0,
      dateRange: { from: null, to: null },
      topCorrectedFields: [],
      ocrConfusions: [],
      summary: {
        manifestsWithCorrections: 0,
        uniqueFieldsCorrected: 0,
        avgDiffsPerLog: 0,
      },
    };
  }
}
