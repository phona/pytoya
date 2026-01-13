import { useState } from 'react';

export interface ManifestFilterValues {
  status?: string;
  poNo?: string;
  dateFrom?: string;
  dateTo?: string;
  department?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  humanVerified?: boolean;
}

interface ManifestFiltersProps {
  values: ManifestFilterValues;
  onChange: (values: ManifestFilterValues) => void;
  manifestCount: number;
}

export function ManifestFilters({ values, onChange, manifestCount }: ManifestFiltersProps) {
  const [confidenceRange, setConfidenceRange] = useState({
    min: values.confidenceMin ?? 0,
    max: values.confidenceMax ?? 100,
  });

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

  const clearFilters = () => {
    onChange({});
    setConfidenceRange({ min: 0, max: 100 });
  };

  const hasActiveFilters = Object.keys(values).some(
    (key) => values[key as keyof ManifestFilterValues] !== undefined,
  );

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
        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
        <input
          type="text"
          value={values.poNo ?? ''}
          onChange={(e) => handleInputChange('poNo', e.target.value)}
          placeholder="Filter by PO..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Date Range */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
        <div className="space-y-2">
          <input
            type="date"
            value={values.dateFrom ?? ''}
            onChange={(e) => handleInputChange('dateFrom', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <input
            type="date"
            value={values.dateTo ?? ''}
            onChange={(e) => handleInputChange('dateTo', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Department */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <input
          type="text"
          value={values.department ?? ''}
          onChange={(e) => handleInputChange('department', e.target.value)}
          placeholder="Filter by department..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Confidence Range */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Confidence: {confidenceRange.min}% - {confidenceRange.max}%
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="100"
            value={confidenceRange.min}
            onChange={(e) => handleConfidenceChange(Number(e.target.value), confidenceRange.max)}
            className="w-full"
          />
          <input
            type="range"
            min="0"
            max="100"
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
