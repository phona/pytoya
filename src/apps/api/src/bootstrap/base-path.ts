export const normalizeBasePath = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
};

export const joinBasePath = (basePath: string, suffix: string): string => {
  const base = normalizeBasePath(basePath);
  const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return base ? `${base}${normalizedSuffix}` : normalizedSuffix;
};

export const toGlobalApiPrefix = (basePath: string): string => {
  const normalized = normalizeBasePath(basePath);
  // Nest expects the global prefix without a leading slash.
  return normalized ? `${normalized.slice(1)}/api` : 'api';
};

