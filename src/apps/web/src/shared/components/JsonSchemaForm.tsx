import { useCallback } from 'react';

interface JsonSchemaFormProps {
  schema: Record<string, unknown>;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
}

type JsonSchemaProperty = {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: string[];
};

export function JsonSchemaForm({ schema, value, onChange, disabled }: JsonSchemaFormProps) {
  const properties = (schema as any)?.properties as Record<string, JsonSchemaProperty> | undefined;
  if (!properties) return <p className="text-xs text-muted-foreground">No configurable parameters</p>;

  const handleChange = useCallback(
    (key: string, newValue: unknown) => {
      onChange({ ...value, [key]: newValue });
    },
    [value, onChange],
  );

  const entries = Object.entries(properties);

  return (
    <div className="space-y-3">
      {entries.map(([key, prop]) => (
        <div key={key} className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            {prop.title ?? key}
            {(schema as any).required?.includes(key) && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </label>
          {prop.description && (
            <p className="text-xs text-muted-foreground">{prop.description}</p>
          )}
          {renderField(key, prop, value[key] ?? prop.default, (v) => handleChange(key, v), disabled)}
        </div>
      ))}
    </div>
  );
}

function renderField(
  key: string,
  prop: JsonSchemaProperty,
  value: unknown,
  onChange: (v: unknown) => void,
  disabled?: boolean,
) {
  const baseClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed';

  if (prop.enum && prop.type === 'string') {
    return (
      <select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={baseClass}
      >
        {prop.enum.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (prop.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="rounded border-border"
      />
    );
  }

  if (prop.type === 'number' || prop.type === 'integer') {
    return (
      <input
        type="number"
        value={value as number ?? ''}
        onChange={(e) => {
          const v = e.target.value === '' ? undefined : Number(e.target.value);
          onChange(v);
        }}
        min={prop.minimum}
        max={prop.maximum}
        disabled={disabled}
        className={baseClass}
      />
    );
  }

  // Default: string
  return (
    <input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={baseClass}
    />
  );
}
