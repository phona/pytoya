import { Fragment, useMemo } from 'react';
import type { OcrResultDto } from '@pytoya/shared/types/manifests';
import { useI18n } from '@/shared/providers/I18nProvider';
import {
  deriveSchemaAuditFields,
  type SchemaLeafField,
} from '@/shared/utils/schema';

type CoverageStatus = 'found' | 'missing' | 'empty';

interface CoverageRow {
  field: SchemaLeafField;
  value: string | null;
  status: CoverageStatus;
}

type CoveragePanelProps = {
  extractedData: Record<string, unknown> | null | undefined;
  jsonSchema: Record<string, unknown> | null | undefined;
  ocrResult: OcrResultDto | null | undefined;
  isOcrLoading: boolean;
};

const getValueAtPath = (
  data: Record<string, unknown> | null | undefined,
  path: string,
): unknown => {
  if (!data || !path) return undefined;
  const segments = path.split('.');
  let current: unknown = data;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const formatValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const normalize = (value: string): string =>
  value.replace(/\s+/g, '').toLowerCase();

const collectOcrText = (ocr: OcrResultDto | null | undefined): string => {
  if (!ocr?.pages) return '';
  return ocr.pages
    .map((page) => page.text ?? '')
    .filter(Boolean)
    .join('\n\n');
};

const computeStatus = (
  normalizedOcr: string,
  value: string | null,
): CoverageStatus => {
  if (value === null) return 'empty';
  if (!normalizedOcr) return 'missing';
  return normalizedOcr.includes(normalize(value)) ? 'found' : 'missing';
};

const highlightOcrText = (
  text: string,
  values: string[],
): Array<{ text: string; highlight: boolean; key: string }> => {
  if (values.length === 0) return [{ text, highlight: false, key: 'all' }];
  const unique = Array.from(new Set(values.filter((v) => v.trim().length > 0)));
  if (unique.length === 0) return [{ text, highlight: false, key: 'all' }];
  unique.sort((a, b) => b.length - a.length);
  const escaped = unique.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(re);
  return parts
    .filter((part) => part.length > 0)
    .map((part, index) => ({
      text: part,
      highlight: unique.some((v) => v === part),
      key: `p-${index}`,
    }));
};

const STATUS_STYLES: Record<CoverageStatus, { dot: string; labelKey: string }> = {
  found: {
    dot: 'bg-green-500',
    labelKey: 'audit.coverage.status.found',
  },
  missing: {
    dot: 'bg-yellow-500',
    labelKey: 'audit.coverage.status.missing',
  },
  empty: {
    dot: 'bg-red-500',
    labelKey: 'audit.coverage.status.empty',
  },
};

export function CoveragePanel({
  extractedData,
  jsonSchema,
  ocrResult,
  isOcrLoading,
}: CoveragePanelProps) {
  const { t } = useI18n();

  const scalarFields = useMemo<SchemaLeafField[]>(() => {
    if (!jsonSchema) return [];
    const { scalarFields: leaves } = deriveSchemaAuditFields(jsonSchema);
    return leaves;
  }, [jsonSchema]);

  const ocrText = useMemo(() => collectOcrText(ocrResult), [ocrResult]);
  const normalizedOcr = useMemo(() => normalize(ocrText), [ocrText]);

  const rows = useMemo<CoverageRow[]>(() => {
    return scalarFields.map((field) => {
      const raw = getValueAtPath(
        (extractedData ?? null) as Record<string, unknown> | null,
        field.path,
      );
      const value = formatValue(raw);
      const status = computeStatus(normalizedOcr, value);
      return { field, value, status };
    });
  }, [scalarFields, extractedData, normalizedOcr]);

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.status] += 1;
        return acc;
      },
      { found: 0, missing: 0, empty: 0 } as Record<CoverageStatus, number>,
    );
  }, [rows]);

  const highlightValues = useMemo(
    () =>
      rows
        .filter((row) => row.status === 'found' && row.value)
        .map((row) => row.value as string),
    [rows],
  );

  const highlightedOcr = useMemo(
    () => highlightOcrText(ocrText, highlightValues),
    [ocrText, highlightValues],
  );

  if (isOcrLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t('audit.coverage.loading')}
      </div>
    );
  }

  if (!jsonSchema) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t('audit.coverage.noSchema')}
      </div>
    );
  }

  if (!ocrResult || ocrText.trim().length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t('audit.coverage.noOcr')}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t('audit.coverage.title')}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('audit.coverage.subtitle')}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          {t('audit.coverage.legend.found', { count: counts.found })}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
          {t('audit.coverage.legend.missing', { count: counts.missing })}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          {t('audit.coverage.legend.empty', { count: counts.empty })}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('audit.coverage.extractedFields')}
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {rows.map((row) => {
                  const { dot, labelKey } = STATUS_STYLES[row.status];
                  return (
                    <tr
                      key={row.field.path}
                      className="border-b border-border/50 align-top"
                    >
                      <td className="w-4 py-2 pl-3 pr-1">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${dot}`}
                          title={t(labelKey)}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-mono text-xs text-muted-foreground">
                          {row.field.path}
                        </div>
                        {row.field.title ? (
                          <div className="text-xs text-foreground/80">
                            {row.field.title}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {row.value !== null ? (
                          <span
                            className={
                              row.status === 'found'
                                ? 'bg-green-500/15 text-green-700 dark:text-green-300 rounded px-1'
                                : 'text-foreground'
                            }
                          >
                            {row.value}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground">
                            {t('audit.coverage.status.empty')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-6 text-center text-xs text-muted-foreground"
                    >
                      {t('audit.coverage.noFields')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-md border border-border">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('audit.coverage.ocrText')}
          </div>
          <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-5 text-foreground">
            {highlightedOcr.map((segment) => (
              <Fragment key={segment.key}>
                {segment.highlight ? (
                  <mark className="rounded bg-green-500/25 px-0.5 text-foreground">
                    {segment.text}
                  </mark>
                ) : (
                  segment.text
                )}
              </Fragment>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
