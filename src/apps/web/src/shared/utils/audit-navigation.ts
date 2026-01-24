import type { ManifestFilterValues, ManifestListQueryParams, ManifestSort } from '@/shared/types/manifests';

export type AuditNavigationScope = 'filtered' | 'all' | 'selected' | 'unknown';

export type AuditNavigationContext = {
  version: 1;
  projectId: number;
  groupId: number;
  scope: Exclude<AuditNavigationScope, 'unknown'>;

  filters?: ManifestFilterValues;
  sort?: ManifestSort;

  page: number;
  pageSize: number;
  total: number;
  totalPages: number;

  pageIds?: number[];
  selectedIds?: number[];

  savedAt: number;
};

type StoredAuditNavigationContext = AuditNavigationContext;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const getAuditNavigationStorageKey = (projectId: number, groupId: number) =>
  `pytoya:audit-nav:v1:${projectId}:${groupId}`;

export const isAuditNavigationContext = (value: unknown): value is AuditNavigationContext => {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (!Number.isFinite(value.projectId)) return false;
  if (!Number.isFinite(value.groupId)) return false;
  if (!['filtered', 'all', 'selected'].includes(String(value.scope))) return false;
  if (!Number.isFinite(value.page)) return false;
  if (!Number.isFinite(value.pageSize)) return false;
  if (!Number.isFinite(value.total)) return false;
  if (!Number.isFinite(value.totalPages)) return false;
  if (!Number.isFinite(value.savedAt)) return false;
  return true;
};

export const loadAuditNavigationContext = (projectId: number, groupId: number): AuditNavigationContext | null => {
  try {
    const key = getAuditNavigationStorageKey(projectId, groupId);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isAuditNavigationContext(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveAuditNavigationContext = (context: AuditNavigationContext) => {
  try {
    const key = getAuditNavigationStorageKey(context.projectId, context.groupId);
    const payload: StoredAuditNavigationContext = context;
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore best-effort persistence failures
  }
};

export const toManifestListQueryParams = (
  context: Pick<AuditNavigationContext, 'filters' | 'sort' | 'page' | 'pageSize' | 'scope'>,
): ManifestListQueryParams => {
  if (context.scope === 'all') {
    return { sort: context.sort, page: context.page, pageSize: context.pageSize };
  }
  return { filters: context.filters, sort: context.sort, page: context.page, pageSize: context.pageSize };
};

