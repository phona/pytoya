import { useMemo, useState } from 'react';
import { useSchemas } from '@/shared/hooks/use-schemas';
import { useExtractors, useExtractorTypes } from '@/shared/hooks/use-extractors';
import {
  DynamicManifestFilter,
  ManifestFilterValues,
} from '@/shared/types/manifests';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useI18n } from '@/shared/providers/I18nProvider';

interface ManifestFiltersProps {
  values: ManifestFilterValues;
  onChange: (values: ManifestFilterValues) => void;
  manifestCount: number;
  variant?: 'sidebar' | 'dialog';
}

export function ManifestFilters({ values, onChange, manifestCount, variant = 'sidebar' }: ManifestFiltersProps) {
  const { t } = useI18n();
  const { schemas } = useSchemas();
  const { types: extractorTypes } = useExtractorTypes();
  const { extractors } = useExtractors(
    values.extractorType ? { extractorType: values.extractorType } : undefined,
  );
  const [dynamicField, setDynamicField] = useState('');
  const [dynamicValue, setDynamicValue] = useState('');
  const [confidenceRange, setConfidenceRange] = useState({
    min: values.confidenceMin ?? 0,
    max: values.confidenceMax ?? 100,
  });
  const [costRange, setCostRange] = useState({
    min: values.costMin ?? 0,
    max: values.costMax ?? 100,
  });


  const fieldOptions = useMemo(() => {
    const options = new Set<string>();

    const collectPaths = (schema: unknown, prefix: string[] = []): string[] => {
      if (!schema || typeof schema !== 'object') {
        return [];
      }

      const schemaNode = schema as {
        type?: string;
        properties?: Record<string, unknown>;
        items?: unknown;
      };

      const hasProperties = schemaNode.properties && typeof schemaNode.properties === 'object';
      const isObjectType = schemaNode.type === 'object' || hasProperties;
      const isArrayType = schemaNode.type === 'array';

      if (isArrayType) {
        return [];
      }

      if (isObjectType && schemaNode.properties) {
        return Object.entries(schemaNode.properties).flatMap(([key, value]) => {
          const nextPrefix = [...prefix, key];
          const nestedPaths = collectPaths(value, nextPrefix);
          return nestedPaths.length > 0 ? nestedPaths : [nextPrefix.join('.')];
        });
      }

      return prefix.length > 0 ? [prefix.join('.')] : [];
    };

    schemas.forEach((schema) => {
      collectPaths(schema.jsonSchema).forEach((path) => options.add(path));
    });

    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [schemas]);

  const handleStatusChange = (status: string) => {
    onChange({
      ...values,
      status: status === 'all' ? undefined : status,
    });
  };

  const handleVerifiedChange = (checked: boolean) => {
    onChange({
      ...values,
      humanVerified: checked || undefined,
    });
  };

  const handleConfidenceChange = (min: number, max: number) => {
    setConfidenceRange({ min, max });
    onChange({
      ...values,
      confidenceMin: min > 0 ? min / 100 : undefined,
      confidenceMax: max < 100 ? max / 100 : undefined,
    });
  };

  const handleCostChange = (min: number, max: number) => {
    setCostRange({ min, max });
    onChange({
      ...values,
      costMin: min > 0 ? min : undefined,
      costMax: max < 100 ? max : undefined,
    });
  };

  const handleExtractionStatusChange = (status: string) => {
    onChange({
      ...values,
      extractionStatus: status === 'all' ? undefined : (status as ManifestFilterValues['extractionStatus']),
    });
  };

  const handleOcrQualityChange = (value: string) => {
    if (value === 'excellent') {
      onChange({ ...values, ocrQualityMin: 90, ocrQualityMax: 100 });
      return;
    }
    if (value === 'good') {
      onChange({ ...values, ocrQualityMin: 70, ocrQualityMax: 89 });
      return;
    }
    if (value === 'poor') {
      onChange({ ...values, ocrQualityMin: 0, ocrQualityMax: 69 });
      return;
    }
    if (value === 'unprocessed') {
      onChange({ ...values, ocrQualityMin: 0, ocrQualityMax: 0 });
      return;
    }
    onChange({ ...values, ocrQualityMin: undefined, ocrQualityMax: undefined });
  };

  const handleExtractorTypeChange = (type: string) => {
    const nextType = type === 'all' ? undefined : type;
    onChange({
      ...values,
      extractorType: nextType,
      textExtractorId: nextType ? undefined : values.textExtractorId,
    });
  };

  const handleExtractorChange = (id: string) => {
    onChange({
      ...values,
      textExtractorId: id === 'all' ? undefined : id,
    });
  };

  const handleAddDynamicFilter = () => {
    const field = dynamicField.trim();
    const value = dynamicValue.trim();
    if (!field || !value) {
      return;
    }

    const existing = values.dynamicFilters ?? [];
    const next: DynamicManifestFilter[] = [
      ...existing,
      { field, value },
    ];

    onChange({
      ...values,
      dynamicFilters: next,
    });

    setDynamicField('');
    setDynamicValue('');
  };

  const handleRemoveDynamicFilter = (index: number) => {
    const existing = values.dynamicFilters ?? [];
    const next = existing.filter((_, idx) => idx !== index);
    onChange({
      ...values,
      dynamicFilters: next.length > 0 ? next : undefined,
    });
  };

  const clearFilters = () => {
    onChange({});
    setConfidenceRange({ min: 0, max: 100 });
    setCostRange({ min: 0, max: 100 });
    setDynamicField('');
    setDynamicValue('');
  };

  const hasActiveFilters = Object.keys(values).some((key) => {
    if (key === 'dynamicFilters') {
      return (values.dynamicFilters ?? []).length > 0;
    }
    return values[key as keyof ManifestFilterValues] !== undefined;
  });

  const statusValue = values.status ?? 'all';
  const extractionStatusValue = values.extractionStatus ?? 'all';
  const extractorTypeValue = values.extractorType ?? 'all';
  const extractorValue = values.textExtractorId ?? 'all';

  const resolveOcrQualitySelection = () => {
    if (values.ocrQualityMin === 90 && values.ocrQualityMax === 100) return 'excellent';
    if (values.ocrQualityMin === 70 && values.ocrQualityMax === 89) return 'good';
    if (values.ocrQualityMin === 0 && values.ocrQualityMax === 69) return 'poor';
    if (values.ocrQualityMin === 0 && values.ocrQualityMax === 0) return 'unprocessed';
    return 'all';
  };

  const ocrQualityValue = resolveOcrQualitySelection();

  return (
    <div className={`bg-card rounded-lg shadow-sm border border-border p-4 ${variant === 'sidebar' ? 'sticky top-4' : ''}`}>
      {variant === 'sidebar' ? (
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-foreground">{t('manifests.filters.title')}</h3>
          {hasActiveFilters && (
            <Button
              type="button"
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary"
            >
              {t('common.clearAll')}
            </Button>
          )}
        </div>
      ) : hasActiveFilters ? (
        <div className="flex justify-end mb-4">
          <Button
            type="button"
            onClick={clearFilters}
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary"
          >
            {t('common.clearAll')}
          </Button>
        </div>
      ) : null}

      {/* Status */}
      <div className="mb-4">
        <label htmlFor="filter-status" className="block text-sm font-medium text-foreground mb-2">
          {t('manifests.filters.status.label')}
        </label>
        <Select value={statusValue} onValueChange={handleStatusChange}>
          <SelectTrigger id="filter-status">
            <SelectValue placeholder={t('manifests.filters.status.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('manifests.filters.status.any')}</SelectItem>
            <SelectItem value="pending">{t('manifests.status.pending')}</SelectItem>
            <SelectItem value="processing">{t('manifests.status.processing')}</SelectItem>
            <SelectItem value="completed">{t('manifests.status.completed')}</SelectItem>
            <SelectItem value="failed">{t('manifests.status.failed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Extraction Status */}
      <div className="mb-4">
        <label htmlFor="filter-extraction-status" className="block text-sm font-medium text-foreground mb-2">
          {t('manifests.filters.extractionStatus.label')}
        </label>
        <Select value={extractionStatusValue} onValueChange={handleExtractionStatusChange}>
          <SelectTrigger id="filter-extraction-status">
            <SelectValue placeholder={t('manifests.filters.extractionStatus.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('manifests.filters.extractionStatus.any')}</SelectItem>
            <SelectItem value="not_extracted">{t('manifests.extractionStatus.notExtracted')}</SelectItem>
            <SelectItem value="extracting">{t('manifests.extractionStatus.extracting')}</SelectItem>
            <SelectItem value="complete">{t('manifests.extractionStatus.complete')}</SelectItem>
            <SelectItem value="partial">{t('manifests.extractionStatus.partial')}</SelectItem>
            <SelectItem value="failed">{t('manifests.extractionStatus.failed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Text Quality */}
      <div className="mb-4">
        <label htmlFor="filter-ocr-quality" className="block text-sm font-medium text-foreground mb-2">
          {t('manifests.filters.ocrQuality.label')}
        </label>
        <Select value={ocrQualityValue} onValueChange={handleOcrQualityChange}>
          <SelectTrigger id="filter-ocr-quality">
            <SelectValue placeholder={t('manifests.filters.ocrQuality.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('manifests.filters.ocrQuality.any')}</SelectItem>
            <SelectItem value="excellent">{t('manifests.filters.ocrQuality.excellent')}</SelectItem>
            <SelectItem value="good">{t('manifests.filters.ocrQuality.good')}</SelectItem>
            <SelectItem value="poor">{t('manifests.filters.ocrQuality.poor')}</SelectItem>
            <SelectItem value="unprocessed">{t('manifests.filters.ocrQuality.notProcessed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Extractor Filters */}
      <div className="mb-4">
        <label htmlFor="filter-extractor-type" className="block text-sm font-medium text-foreground mb-2">
          {t('manifests.filters.extractorType.label')}
        </label>
        <Select value={extractorTypeValue} onValueChange={handleExtractorTypeChange}>
          <SelectTrigger id="filter-extractor-type">
            <SelectValue placeholder={t('manifests.filters.extractorType.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('manifests.filters.extractorType.any')}</SelectItem>
            {extractorTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <label htmlFor="filter-extractor" className="block text-sm font-medium text-foreground mb-2">
          {t('manifests.filters.extractor.label')}
        </label>
        <Select value={extractorValue} onValueChange={handleExtractorChange}>
          <SelectTrigger id="filter-extractor">
            <SelectValue placeholder={t('manifests.filters.extractor.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('manifests.filters.extractor.any')}</SelectItem>
            {extractors.map((extractor) => (
              <SelectItem key={extractor.id} value={extractor.id}>
                {extractor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic Field Filters */}
      <div className="mb-4">
        <p className="block text-sm font-medium text-foreground mb-2">{t('manifests.filters.customField.label')}</p>
        <div className="space-y-2">
          <div>
            <label htmlFor="dynamicFieldPath" className="sr-only">
              {t('manifests.filters.customField.pathAria')}
            </label>
            <Input
              id="dynamicFieldPath"
              list="dynamic-field-options"
              type="text"
              value={dynamicField}
              onChange={(e) => setDynamicField(e.target.value)}
              placeholder={t('manifests.filters.customField.pathPlaceholder')}
            />
            <datalist id="dynamic-field-options">
              {fieldOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="dynamicFieldValue" className="sr-only">
              {t('manifests.filters.customField.valueAria')}
            </label>
            <Input
              id="dynamicFieldValue"
              type="text"
              value={dynamicValue}
              onChange={(e) => setDynamicValue(e.target.value)}
              placeholder={t('manifests.filters.customField.valuePlaceholder')}
            />
          </div>
          <Button
            type="button"
            onClick={handleAddDynamicFilter}
            variant="outline"
            className="w-full"
          >
            {t('manifests.filters.customField.addButton')}
          </Button>
        </div>

        {(values.dynamicFilters ?? []).length > 0 && (
          <div className="mt-3 space-y-2">
            {(values.dynamicFilters ?? []).map((filter, index) => (
              <div
                key={`${filter.field}-${index}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs text-muted-foreground"
              >
                <span className="truncate">
                  {filter.field}: {filter.value}
                </span>
                <Button
                  type="button"
                  onClick={() => handleRemoveDynamicFilter(index)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-muted-foreground"
                >
                  {t('common.remove')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confidence Range */}
      <div className="mb-4">
        <p className="block text-sm font-medium text-foreground mb-1">
          {t('manifests.filters.confidenceRange.label', {
            min: confidenceRange.min,
            max: confidenceRange.max,
          })}
        </p>
        <div className="space-y-2">
          <Input
            type="range"
            min="0"
            max="100"
            aria-label={t('manifests.filters.confidenceRange.minAria')}
            value={confidenceRange.min}
            onChange={(e) => handleConfidenceChange(Number(e.target.value), confidenceRange.max)}
            className="h-2 px-0 py-0"
          />
          <Input
            type="range"
            min="0"
            max="100"
            aria-label={t('manifests.filters.confidenceRange.maxAria')}
            value={confidenceRange.max}
            onChange={(e) => handleConfidenceChange(confidenceRange.min, Number(e.target.value))}
            className="h-2 px-0 py-0"
          />
        </div>
      </div>

      {/* Cost Range */}
      <div className="mb-4">
        <p className="block text-sm font-medium text-foreground mb-1">
          {t('manifests.filters.costRange.label', {
            min: costRange.min.toFixed(2),
            max: costRange.max.toFixed(2),
          })}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min="0"
            step="0.01"
            aria-label={t('manifests.filters.costRange.minAria')}
            value={costRange.min}
            onChange={(e) => handleCostChange(Number(e.target.value), costRange.max)}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            aria-label={t('manifests.filters.costRange.maxAria')}
            value={costRange.max}
            onChange={(e) => handleCostChange(costRange.min, Number(e.target.value))}
          />
        </div>
        <div className="space-y-2 mt-2">
          <Input
            type="range"
            min="0"
            max="100"
            step="0.5"
            aria-label={t('manifests.filters.costRange.minSliderAria')}
            value={costRange.min}
            onChange={(e) => handleCostChange(Number(e.target.value), costRange.max)}
            className="h-2 px-0 py-0"
          />
          <Input
            type="range"
            min="0"
            max="100"
            step="0.5"
            aria-label={t('manifests.filters.costRange.maxSliderAria')}
            value={costRange.max}
            onChange={(e) => handleCostChange(costRange.min, Number(e.target.value))}
            className="h-2 px-0 py-0"
          />
        </div>
      </div>

      {/* Human Verified */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={values.humanVerified ?? false}
            onCheckedChange={(checked) => handleVerifiedChange(checked === true)}
            aria-label={t('manifests.filters.humanVerified.aria')}
          />
          <span>{t('manifests.filters.humanVerified.label')}</span>
        </div>
      </div>

      {/* Results Count */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {t(
            hasActiveFilters
              ? 'manifests.filters.results.filtered'
              : 'manifests.filters.results.total',
            {
              count: manifestCount,
              plural: manifestCount === 1 ? '' : 's',
            },
          )}
        </p>
      </div>
    </div>
  );
}
