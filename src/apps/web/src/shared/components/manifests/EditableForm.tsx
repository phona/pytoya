import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import type { Manifest } from '@/api/manifests';
import { deriveSchemaAuditFields, SchemaArrayField, SchemaArrayObjectField, SchemaLeafField } from '@/shared/utils/schema';

interface EditableFormProps {
  manifest: Manifest;
  jsonSchema?: Record<string, unknown>;
  extractionHintMap?: Record<string, string>;
  onSave: (data: Partial<Manifest>) => void;
  onReExtractField: (fieldName: string) => void;
  onViewExtractionHistory?: (fieldPath: string) => void;
  onEditFieldHint?: (fieldPath: string) => void;
}

type ExtractedData = Record<string, unknown> & {
  _extraction_info?: {
    field_confidences?: Record<string, number>;
    confidence?: number;
    ocr_issues?: string[];
    uncertain_fields?: string[];
  };
};

type DraftState = {
  extractedData: ExtractedData;
  humanVerified: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeHintPath = (path: string): string => path.replace(/\[(\d+)\]/g, '[]');

const parsePathPart = (
  part: string,
): { key: string; anyArray: boolean; arrayIndex: number | null } => {
  const anyMatch = part.match(/(.+)\[\]$/);
  if (anyMatch) {
    return { key: anyMatch[1], anyArray: true, arrayIndex: null };
  }

  const arrayMatch = part.match(/(.+)\[(\d+)\]$/);
  if (arrayMatch) {
    return { key: arrayMatch[1], anyArray: false, arrayIndex: Number.parseInt(arrayMatch[2], 10) };
  }

  return { key: part, anyArray: false, arrayIndex: null };
};

const getNestedValue = (obj: unknown, fieldPath: string): unknown => {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  const parts = fieldPath.split('.').filter(Boolean);
  const readPath = (current: unknown, index: number): unknown => {
    if (index >= parts.length) {
      return current;
    }
    if (current === null || typeof current !== 'object') {
      return undefined;
    }

    const { key, anyArray, arrayIndex } = parsePathPart(parts[index]);
    const record = current as Record<string, unknown>;
    const nextValue = record[key];

    if (anyArray) {
      if (!Array.isArray(nextValue) || nextValue.length === 0) {
        return undefined;
      }
      if (index === parts.length - 1) {
        return nextValue;
      }
      for (const item of nextValue) {
        const result = readPath(item, index + 1);
        if (result !== undefined) {
          return result;
        }
      }
      return undefined;
    }

    if (arrayIndex !== null) {
      if (!Array.isArray(nextValue) || arrayIndex >= nextValue.length) {
        return undefined;
      }
      return readPath(nextValue[arrayIndex], index + 1);
    }

    if (!(key in record)) {
      return undefined;
    }
    return readPath(nextValue, index + 1);
  };

  return readPath(obj, 0);
};

const setNestedValue = (
  obj: Record<string, unknown>,
  fieldPath: string,
  value: unknown,
): Record<string, unknown> => {
  const parts = fieldPath.split('.').filter(Boolean);
  if (parts.length === 0) {
    return obj;
  }

  const root = { ...obj };
  let cursor: Record<string, unknown> = root;
  for (let i = 0; i < parts.length; i += 1) {
    const isLast = i === parts.length - 1;
    const { key, arrayIndex } = parsePathPart(parts[i]);

    if (arrayIndex !== null) {
      const currentArray = Array.isArray(cursor[key]) ? (cursor[key] as unknown[]) : [];
      const nextArray = [...currentArray];
      while (nextArray.length <= arrayIndex) {
        nextArray.push({});
      }

      if (isLast) {
        nextArray[arrayIndex] = value;
        cursor[key] = nextArray;
        break;
      }

      const existingEntry = nextArray[arrayIndex];
      const nextEntry = isRecord(existingEntry) ? { ...existingEntry } : {};
      nextArray[arrayIndex] = nextEntry;
      cursor[key] = nextArray;
      cursor = nextEntry;
      continue;
    }

    if (isLast) {
      cursor[key] = value;
      break;
    }

    const existing = cursor[key];
    const next = isRecord(existing) ? { ...existing } : {};
    cursor[key] = next;
    cursor = next;
  }

  return root;
};

const formatLabel = (raw: string): string => {
  const cleaned = raw.replace(/\[\]|\[\d+\]/g, '').replace(/_/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(/\s+/g)
    .map((part) => (part ? `${part.slice(0, 1).toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
};

const getPathLeaf = (path: string): string => {
  const parts = path.split('.').filter(Boolean);
  const leaf = parts[parts.length - 1] ?? path;
  return leaf.replace(/\[\]|\[\d+\]/g, '');
};

const toInputId = (path: string): string =>
  `audit_${path.replace(/[.[\]]/g, '_').replace(/_+/g, '_')}`;

const sortFields = (fields: SchemaLeafField[]): SchemaLeafField[] => {
  const required = fields.filter((field) => field.required).sort((a, b) => a.schemaOrder - b.schemaOrder);
  const optional = fields
    .filter((field) => !field.required)
    .sort((a, b) => a.path.localeCompare(b.path));
  return [...required, ...optional];
};

const isJsonEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!isJsonEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord);
    const bKeys = Object.keys(bRecord);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!(key in bRecord)) return false;
      if (!isJsonEqual(aRecord[key], bRecord[key])) return false;
    }
    return true;
  }

  return false;
};

function AuditFieldInput({
  fieldPath,
  label,
  field,
  value,
  confidenceColor,
  hint,
  onChange,
  onReExtract,
  onViewHistory,
  onEditHint,
}: {
  fieldPath: string;
  label: string;
  field: SchemaLeafField;
  value: unknown;
  confidenceColor: string;
  hint?: string;
  onChange: (next: unknown) => void;
  onReExtract: () => void;
  onViewHistory?: () => void;
  onEditHint?: () => void;
}) {
  const inputId = toInputId(fieldPath);
  const inputType =
    field.type === 'number' || field.type === 'integer'
      ? 'number'
      : field.format === 'date'
        ? 'date'
        : field.format === 'date-time'
          ? 'datetime-local'
          : 'text';

  const displayValue =
    field.type === 'number' || field.type === 'integer'
      ? typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? value
          : ''
      : typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '';

  return (
    <div>
      {field.type === 'boolean' ? (
        <div>
          <div className={`w-full border-l-4 rounded-md px-3 py-2 text-sm ${confidenceColor}`}>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => onChange(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-ring"
                />
                <span>{label}</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={onReExtract}
                  className="text-xs text-primary hover:text-primary flex items-center gap-1"
                  title="Re-extract this field"
                >
                  <RefreshCw className="h-3 w-3" />
                  Re-extract
                </button>
                {onViewHistory && (
                  <button
                    onClick={onViewHistory}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    title="View extraction history for this field"
                  >
                    <Clock className="h-3 w-3" />
                    History
                  </button>
                )}
                {onEditHint && (
                  <button
                    onClick={onEditHint}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    title="Edit x-extraction-hint"
                  >
                    <Pencil className="h-3 w-3" />
                    Hint
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
              {label}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={onReExtract}
                className="text-xs text-primary hover:text-primary flex items-center gap-1"
                title="Re-extract this field"
                >
                  <RefreshCw className="h-3 w-3" />
                  Re-extract
                </button>
              {onViewHistory && (
                <button
                  onClick={onViewHistory}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  title="View extraction history for this field"
                >
                  <Clock className="h-3 w-3" />
                  History
                </button>
              )}
              {onEditHint && (
                <button
                  onClick={onEditHint}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  title="Edit x-extraction-hint"
                >
                  <Pencil className="h-3 w-3" />
                  Hint
                </button>
              )}
            </div>
          </div>
          <input
            id={inputId}
            type={inputType}
            value={displayValue}
          onChange={(e) => {
            const raw = e.target.value;
            if (field.type === 'integer') {
              if (!raw.trim()) {
                onChange(null);
                return;
              }
              const parsed = Number.parseInt(raw, 10);
              onChange(Number.isFinite(parsed) ? parsed : null);
              return;
            }
            if (field.type === 'number') {
              if (!raw.trim()) {
                onChange(null);
                return;
              }
              const parsed = Number.parseFloat(raw);
              onChange(Number.isFinite(parsed) ? parsed : null);
              return;
            }
            onChange(raw);
          }}
            className={`w-full border-l-4 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-ring ${confidenceColor}`}
          />
        </div>
      )}

      {hint && (
        <p className="mt-1 text-xs text-muted-foreground">
          hint: {hint}
        </p>
      )}
    </div>
  );
}

export function EditableForm({
  manifest,
  jsonSchema,
  extractionHintMap,
  onSave,
  onReExtractField,
  onViewExtractionHistory,
  onEditFieldHint,
}: EditableFormProps) {
  const humanVerified = Boolean(manifest.humanVerified);
  const hintMap = extractionHintMap ?? {};

  const baseExtractedData = useMemo<ExtractedData>(() => {
    const raw = manifest.extractedData ?? null;
    return (isRecord(raw) ? raw : {}) as ExtractedData;
  }, [manifest.extractedData]);

  const schemaFields = useMemo(() => {
    if (!jsonSchema) {
      return { scalarFields: [], arrayObjectFields: [], arrayFields: [] };
    }
    return deriveSchemaAuditFields(jsonSchema);
  }, [jsonSchema]);

  const sections = useMemo(() => {
    type ScalarSection = {
      kind: 'scalar';
      key: string;
      title: string;
      order: number;
      fields: SchemaLeafField[];
    };

    type ArrayObjectSection = {
      kind: 'arrayObject';
      key: string;
      title: string;
      order: number;
      arrayField: SchemaArrayObjectField;
    };

    type ArrayScalarSection = {
      kind: 'arrayScalar';
      key: string;
      title: string;
      order: number;
      arrayField: SchemaArrayField;
    };

    const scalarBySection = new Map<string, SchemaLeafField[]>();
    for (const field of schemaFields.scalarFields) {
      const sectionKey = field.path.split('.')[0] ?? field.path;
      const list = scalarBySection.get(sectionKey) ?? [];
      list.push(field);
      scalarBySection.set(sectionKey, list);
    }

    const scalarSections: ScalarSection[] = Array.from(scalarBySection.entries()).map(([key, fields]) => ({
      kind: 'scalar',
      key,
      title: formatLabel(key),
      order: Math.min(...fields.map((field) => field.schemaOrder)),
      fields: sortFields(fields),
    }));

    const arrayObjectSections: ArrayObjectSection[] = schemaFields.arrayObjectFields.map((arrayField) => {
      const displayKey = arrayField.path.split('.').pop() ?? arrayField.path;
      return {
        kind: 'arrayObject',
        key: arrayField.path,
        title: arrayField.title ?? formatLabel(displayKey),
        order: arrayField.schemaOrder,
        arrayField: {
          ...arrayField,
          itemFields: sortFields(arrayField.itemFields),
        },
      };
    });

    const arrayScalarSections: ArrayScalarSection[] = schemaFields.arrayFields.map((arrayField) => {
      const displayKey = arrayField.path.split('.').pop() ?? arrayField.path;
      return {
        kind: 'arrayScalar',
        key: arrayField.path,
        title: arrayField.title ?? formatLabel(displayKey),
        order: arrayField.schemaOrder,
        arrayField,
      };
    });

    const all = [...scalarSections, ...arrayObjectSections, ...arrayScalarSections];
    all.sort((a, b) => a.order - b.order);
    return all;
  }, [schemaFields.arrayFields, schemaFields.arrayObjectFields, schemaFields.scalarFields]);

  const [draft, setDraft] = useState<DraftState>(() => ({
    extractedData: baseExtractedData,
    humanVerified,
  }));
  const [isDirty, setIsDirty] = useState(false);
  const lastManifestId = useRef<number>(manifest.id);

  useEffect(() => {
    if (lastManifestId.current === manifest.id) {
      return;
    }
    lastManifestId.current = manifest.id;
    setDraft({ extractedData: baseExtractedData, humanVerified });
    setIsDirty(false);
  }, [baseExtractedData, humanVerified, manifest.id]);

  useEffect(() => {
    if (isDirty) {
      return;
    }
    setDraft({
      extractedData: baseExtractedData,
      humanVerified,
    });
  }, [baseExtractedData, humanVerified, isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    onSave({
      extractedData: draft.extractedData,
      humanVerified: draft.humanVerified,
    });
  }, [draft.extractedData, draft.humanVerified, isDirty, onSave]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const matches =
      draft.humanVerified === humanVerified && isJsonEqual(draft.extractedData, baseExtractedData);
    if (matches) {
      setIsDirty(false);
    }
  }, [baseExtractedData, draft.extractedData, draft.humanVerified, humanVerified, isDirty]);

  const getHint = (fieldPath: string): string | undefined => {
    const trimmed = normalizeHintPath(fieldPath.trim());
    if (!trimmed) {
      return undefined;
    }

    const direct = hintMap[trimmed];
    if (direct) {
      return direct;
    }

    if (trimmed.includes('.')) {
      const parts = trimmed.split('.').filter(Boolean);
      const parent = parts.slice(0, -1).join('.');
      const leaf = parts[parts.length - 1];
      return hintMap[parent] ?? hintMap[leaf];
    }

    return undefined;
  };

  const getConfidenceColor = (schemaPath: string, indexedPath?: string) => {
    const extractionInfo = draft.extractedData._extraction_info ?? {};
    const confidences = extractionInfo.field_confidences ?? {};

    const keysToTry = [
      indexedPath,
      indexedPath ? normalizeHintPath(indexedPath) : undefined,
      schemaPath,
      normalizeHintPath(schemaPath),
    ].filter(Boolean) as string[];

    const fieldConfidence = keysToTry
      .map((key) => confidences[key])
      .find((value): value is number => typeof value === 'number');

    if (!fieldConfidence) return 'border-border';
    if (fieldConfidence >= 0.9) return 'border-[color:var(--status-completed-text)]';
    if (fieldConfidence >= 0.7) return 'border-[color:var(--status-pending-text)]';
    return 'border-[color:var(--status-failed-text)]';
  };

  const updateField = (path: string, value: unknown) => {
    setDraft((prev) => ({
      ...prev,
      extractedData: setNestedValue(prev.extractedData, path, value) as ExtractedData,
    }));
    setIsDirty(true);
  };

  const updateHumanVerified = (next: boolean) => {
    setDraft((prev) => ({ ...prev, humanVerified: next }));
    setIsDirty(true);
  };

  const buildEmptyArrayItem = (arrayField: SchemaArrayObjectField) => {
    const prefix = `${arrayField.path}[].`;
    let result: Record<string, unknown> = {};
    for (const field of arrayField.itemFields) {
      const relativePath = field.path.startsWith(prefix)
        ? field.path.slice(prefix.length)
        : getPathLeaf(field.path);
      const defaultValue =
        field.type === 'boolean' ? false : field.type === 'number' || field.type === 'integer' ? 0 : '';
      result = setNestedValue(result, relativePath, defaultValue);
    }
    return result;
  };

  const addArrayItem = (arrayField: SchemaArrayObjectField) => {
    setDraft((prev) => {
      const current = getNestedValue(prev.extractedData, arrayField.path);
      const rows = Array.isArray(current) ? current : [];
      const nextItem = buildEmptyArrayItem(arrayField);
      const nextExtractedData = setNestedValue(
        prev.extractedData,
        arrayField.path,
        [...rows, nextItem],
      ) as ExtractedData;
      return { ...prev, extractedData: nextExtractedData };
    });
    setIsDirty(true);
  };

  const deleteArrayItem = (arrayPath: string, index: number) => {
    setDraft((prev) => {
      const current = getNestedValue(prev.extractedData, arrayPath);
      const rows = Array.isArray(current) ? current : [];
      const nextRows = rows.filter((_, i) => i !== index);
      const nextExtractedData = setNestedValue(prev.extractedData, arrayPath, nextRows) as ExtractedData;
      return { ...prev, extractedData: nextExtractedData };
    });
    setIsDirty(true);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Extraction Info */}
      {draft.extractedData._extraction_info && (
        <ExtractionAlert extractionInfo={draft.extractedData._extraction_info} />
      )}

      {!jsonSchema && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Project schema is not available (or invalid) for this manifest. Fix the project JSON Schema so the root object defines `properties`.
        </div>
      )}

      {sections.map((section) => {
        if (section.kind === 'scalar') {
          return (
            <section key={`scalar:${section.key}`} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              </div>
              {getHint(section.key) && (
                <p className="text-xs text-muted-foreground">
                  hint: {getHint(section.key)}
                </p>
              )}
              <div className="space-y-4">
                {section.fields.map((field) => {
                  const label = field.title ?? formatLabel(getPathLeaf(field.path));
                  const value = getNestedValue(draft.extractedData, field.path);
                  return (
                      <AuditFieldInput
                        key={field.path}
                        fieldPath={field.path}
                        label={label}
                        field={field}
                        value={value}
                        hint={getHint(field.path)}
                        confidenceColor={getConfidenceColor(field.path)}
                        onChange={(next) => updateField(field.path, next)}
                        onReExtract={() => onReExtractField(field.path)}
                        onViewHistory={onViewExtractionHistory ? () => onViewExtractionHistory(field.path) : undefined}
                        onEditHint={onEditFieldHint ? () => onEditFieldHint(normalizeHintPath(field.path)) : undefined}
                      />
                    );
                  })}
                </div>
            </section>
          );
        }

        if (section.kind === 'arrayScalar') {
          const arrayField = section.arrayField;
          const raw = getNestedValue(draft.extractedData, arrayField.path);
          const value = raw ?? null;

          return (
            <section key={`arrayScalar:${section.key}`} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
               <div className="flex items-center gap-2">
                  <button
                    onClick={() => onReExtractField(arrayField.path)}
                    className="text-xs text-primary hover:text-primary flex items-center gap-1"
                    title="Re-extract this field"
                >
                  <RefreshCw className="h-3 w-3" />
                  Re-extract
                </button>
                  {onViewExtractionHistory && (
                    <button
                      onClick={() => onViewExtractionHistory(arrayField.path)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      title="View extraction history for this field"
                    >
                      <Clock className="h-3 w-3" />
                      History
                    </button>
                  )}
                  {onEditFieldHint && (
                    <button
                      onClick={() => onEditFieldHint(normalizeHintPath(arrayField.path))}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      title="Edit x-extraction-hint"
                    >
                      <Pencil className="h-3 w-3" />
                      Hint
                    </button>
                  )}
                </div>
              </div>

              {getHint(arrayField.path) && (
                <p className="text-xs text-muted-foreground">
                  hint: {getHint(arrayField.path)}
                </p>
              )}

              <pre className="rounded-lg border border-border bg-background p-3 text-xs text-foreground overflow-x-auto">
                {value === null ? 'No data' : JSON.stringify(value, null, 2)}
              </pre>
            </section>
          );
        }

        const arrayField = section.arrayField;
        const raw = getNestedValue(draft.extractedData, arrayField.path);
        const rows = Array.isArray(raw) ? raw : [];

        return (
          <section key={`arrayObject:${section.key}`} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onReExtractField(arrayField.path)}
                  className="text-xs text-primary hover:text-primary flex items-center gap-1"
                  title="Re-extract this field"
                >
                  <RefreshCw className="h-3 w-3" />
                  Re-extract
                </button>
                {onViewExtractionHistory && (
                  <button
                    onClick={() => onViewExtractionHistory(arrayField.path)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    title="View extraction history for this field"
                  >
                    <Clock className="h-3 w-3" />
                    History
                  </button>
                )}
                {onEditFieldHint && (
                  <button
                    onClick={() => onEditFieldHint(normalizeHintPath(arrayField.path))}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    title="Edit x-extraction-hint"
                  >
                    <Pencil className="h-3 w-3" />
                    Hint
                  </button>
                )}
                <button
                  onClick={() => addArrayItem(arrayField)}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {getHint(arrayField.path) && (
              <p className="text-xs text-muted-foreground">
                hint: {getHint(arrayField.path)}
              </p>
            )}

            {rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No items. Click &quot;Add Item&quot; to create one.
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row, index) => {
                  const rowKey =
                    isRecord(row) && (typeof row.id === 'number' || typeof row.id === 'string') ? String(row.id) : String(index);

                  return (
                    <div key={rowKey} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => deleteArrayItem(arrayField.path, index)}
                          className="text-destructive hover:text-destructive text-sm"
                          title="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {arrayField.itemFields.map((field) => {
                          const label = field.title ?? formatLabel(getPathLeaf(field.path));
                          const indexedPath = normalizeHintPath(field.path).replace('[]', `[${index}]`);
                          const value = getNestedValue(draft.extractedData, indexedPath);

                          return (
                            <AuditFieldInput
                              key={`${indexedPath}:${field.path}`}
                              fieldPath={indexedPath}
                              label={label}
                              field={field}
                              value={value}
                              hint={getHint(field.path)}
                              confidenceColor={getConfidenceColor(field.path, indexedPath)}
                              onChange={(next) => updateField(indexedPath, next)}
                              onReExtract={() => onReExtractField(indexedPath)}
                              onViewHistory={onViewExtractionHistory ? () => onViewExtractionHistory(indexedPath) : undefined}
                              onEditHint={onEditFieldHint ? () => onEditFieldHint(normalizeHintPath(field.path)) : undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {/* Human Verified */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <input
          type="checkbox"
          id="human_verified"
          checked={draft.humanVerified}
          onChange={(e) => updateHumanVerified(e.target.checked)}
          className="rounded border-border text-primary focus:ring-ring"
        />
        <label htmlFor="human_verified" className="text-sm text-foreground">
          Human Verified
        </label>
      </div>
    </div>
  );
}

interface ExtractionAlertProps {
  extractionInfo: {
    confidence?: number;
    ocr_issues?: string[];
    uncertain_fields?: string[];
  };
}

function ExtractionAlert({ extractionInfo }: ExtractionAlertProps) {
  const issues = extractionInfo.ocr_issues || [];
  const uncertainFields = extractionInfo.uncertain_fields || [];

  if (issues.length === 0 && uncertainFields.length === 0) {
    return null;
  }

  return (
    <div className="bg-[color:var(--status-warning-bg)] border border-border rounded-lg p-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-[color:var(--status-warning-text)] mt-0.5 mr-2" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-[color:var(--status-warning-text)]">Extraction Issues</h4>
          <ul className="mt-2 text-sm text-[color:var(--status-warning-text)] list-disc list-inside">
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
            {uncertainFields.map((field, i) => (
              <li key={`uncertain-${i}`}>Uncertain field: {field}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
