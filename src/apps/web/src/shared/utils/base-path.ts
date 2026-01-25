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

export const joinBasePath = (basePath: string, pathname: string): string => {
  const base = normalizeBasePath(basePath);
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return base ? `${base}${normalizedPathname}` : normalizedPathname;
};

export const stripBasePath = (basePath: string, pathname: string): string => {
  const base = normalizeBasePath(basePath);
  if (!base) {
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
  }

  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (normalizedPathname === base) {
    return '/';
  }

  if (!normalizedPathname.startsWith(`${base}/`)) {
    return normalizedPathname;
  }

  const stripped = normalizedPathname.slice(base.length);
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
};
