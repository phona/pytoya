import { useMemo, useState } from 'react';
import { useSchemas } from '@/shared/hooks/use-schemas';
import {
  DynamicManifestFilter,
  ManifestFilterValues,
} from '@/shared/types/manifests';

interface ManifestFiltersProps {
  values: ManifestFilterValues;
  onChange: (values: ManifestFilterValues) => void;
  manifestCount: number;
}

export function ManifestFilters({ values, onChange, manifestCount }: ManifestFiltersProps) {
  const { schemas } = useSchemas();
  const [dynamicField, setDynamicField] = useState('');
  const [dynamicValue, setDynamicValue] = useState('');
  const [confidenceRange, setConfidenceRange] = useState({
    min: values.confidenceMin ?? 0,
    max: values.confidenceMax ?? 100,
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
      status: values.status === status ? undefined : status,
    });
  };

  const handleInputChange = (field: keyof ManifestFilterValues, value: string) => {
    onChange({
      ...values,
      [field]: value || undefined,
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
    setDynamicField('');
    setDynamicValue('');
  };

  const hasActiveFilters = Object.keys(values).some((key) => {
    if (key === 'dynamicFilters') {
      return (values.dynamicFilters ?? []).length > 0;
    }
    return values[key as keyof ManifestFilterValues] !== undefined;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-indigo-600 hover:text-indigo-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Status */}
      <div className="mb-4">
        <p className="block text-sm font-medium text-gray-700 mb-2">Status</p>
        <div className="space-y-1">
          {['pending', 'processing', 'completed', 'failed'].map((status) => (
            <label key={status} className="flex items-center">
              <input
                type="checkbox"
                checked={values.status === status}
                onChange={() => handleStatusChange(status)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-600 capitalize">{status}</span>
            </label>
          ))}
        </div>
      </div>

      {/* PO Number */}
      <div className="mb-4">
        <label htmlFor="filterPoNo" className="block text-sm font-medium text-gray-700 mb-1">
          PO Number
        </label>
        <input
          id="filterPoNo"
          type="text"
          value={values.poNo ?? ''}
          onChange={(e) => handleInputChange('poNo', e.target.value)}
          placeholder="Filter by PO..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Date Range */}
      <div className="mb-4">
        <p className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</p>
        <div className="space-y-2">
          <input
            type="date"
            aria-label="Invoice date from"
            value={values.dateFrom ?? ''}
            onChange={(e) => handleInputChange('dateFrom', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <input
            type="date"
            aria-label="Invoice date to"
            value={values.dateTo ?? ''}
            onChange={(e) => handleInputChange('dateTo', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Department */}
      <div className="mb-4">
        <label htmlFor="filterDepartment" className="block text-sm font-medium text-gray-700 mb-1">
          Department
        </label>
        <input
          id="filterDepartment"
          type="text"
          value={values.department ?? ''}
          onChange={(e) => handleInputChange('department', e.target.value)}
          placeholder="Filter by department..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Dynamic Field Filters */}
      <div className="mb-4">
        <p className="block text-sm font-medium text-gray-700 mb-2">Custom Field</p>
        <div className="space-y-2">
          <div>
            <label htmlFor="dynamicFieldPath" className="sr-only">
              Field path
            </label>
            <input
              id="dynamicFieldPath"
              list="dynamic-field-options"
              type="text"
              value={dynamicField}
              onChange={(e) => setDynamicField(e.target.value)}
              placeholder="e.g. invoice.po_no"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <datalist id="dynamic-field-options">
              {fieldOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="dynamicFieldValue" className="sr-only">
              Field value
            </label>
            <input
              id="dynamicFieldValue"
              type="text"
              value={dynamicValue}
              onChange={(e) => setDynamicValue(e.target.value)}
              placeholder="Value to match"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={handleAddDynamicFilter}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Add Field Filter
          </button>
        </div>

        {(values.dynamicFilters ?? []).length > 0 && (
          <div className="mt-3 space-y-2">
            {(values.dynamicFilters ?? []).map((filter, index) => (
              <div
                key={`${filter.field}-${index}`}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600"
              >
                <span className="truncate">
                  {filter.field}: {filter.value}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveDynamicFilter(index)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confidence Range */}
      <div className="mb-4">
        <p className="block text-sm font-medium text-gray-700 mb-1">
          Confidence: {confidenceRange.min}% - {confidenceRange.max}%
        </p>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="100"
            aria-label="Confidence minimum"
            value={confidenceRange.min}
            onChange={(e) => handleConfidenceChange(Number(e.target.value), confidenceRange.max)}
            className="w-full"
          />
          <input
            type="range"
            min="0"
            max="100"
            aria-label="Confidence maximum"
            value={confidenceRange.max}
            onChange={(e) => handleConfidenceChange(confidenceRange.min, Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Human Verified */}
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={values.humanVerified ?? false}
            onChange={(e) => handleVerifiedChange(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="ml-2 text-sm text-gray-600">Human Verified Only</span>
        </label>
      </div>

      {/* Results Count */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {hasActiveFilters ? 'Filtered' : 'Total'}: {manifestCount} manifest
          {manifestCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
