export type DynamicManifestFilter = {
  field: string;
  value: string;
};

export type ManifestFilterValues = {
  status?: string;
  poNo?: string;
  dateFrom?: string;
  dateTo?: string;
  department?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  ocrQualityMin?: number;
  ocrQualityMax?: number;
  extractionStatus?: 'not_extracted' | 'extracting' | 'complete' | 'partial' | 'failed';
  costMin?: number;
  costMax?: number;
  humanVerified?: boolean;
  dynamicFilters?: DynamicManifestFilter[];
};

export type ManifestSort = {
  field: string;
  order: 'asc' | 'desc';
};

export type ManifestListQueryParams = {
  filters?: ManifestFilterValues;
  sort?: ManifestSort;
  page?: number;
  pageSize?: number;
};




