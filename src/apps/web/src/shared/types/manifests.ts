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




