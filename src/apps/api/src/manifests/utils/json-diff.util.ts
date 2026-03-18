export interface FieldDiff {
  path: string;
  before: unknown;
  after: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalize(value: unknown): unknown {
  return value === undefined ? null : value;
}

function deepEqual(a: unknown, b: unknown): boolean {
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return true;
  if (na === null || nb === null) return false;
  if (typeof na !== typeof nb) return false;

  if (Array.isArray(na) && Array.isArray(nb)) {
    if (na.length !== nb.length) return false;
    return na.every((item, i) => deepEqual(item, nb[i]));
  }

  if (isPlainObject(na) && isPlainObject(nb)) {
    const keys = new Set([...Object.keys(na), ...Object.keys(nb)]);
    for (const key of keys) {
      if (!deepEqual(na[key], nb[key])) return false;
    }
    return true;
  }

  return false;
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  diffs: FieldDiff[],
): void {
  const nb = normalize(before);
  const na = normalize(after);

  if (deepEqual(nb, na)) return;

  if (Array.isArray(nb) && Array.isArray(na)) {
    const maxLen = Math.max(nb.length, na.length);
    for (let i = 0; i < maxLen; i++) {
      walk(
        i < nb.length ? nb[i] : null,
        i < na.length ? na[i] : null,
        path ? `${path}.${i}` : `${i}`,
        diffs,
      );
    }
    return;
  }

  if (isPlainObject(nb) && isPlainObject(na)) {
    const keys = new Set([...Object.keys(nb), ...Object.keys(na)]);
    for (const key of keys) {
      walk(nb[key], na[key], path ? `${path}.${key}` : key, diffs);
    }
    return;
  }

  diffs.push({ path, before: nb, after: na });
}

export function computeJsonDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  walk(before ?? {}, after ?? {}, '', diffs);
  return diffs;
}
