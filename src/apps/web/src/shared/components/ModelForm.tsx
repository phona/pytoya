import { useMemo, useState } from 'react';
import { AdapterSchema, CreateModelDto, Model, UpdateModelDto } from '@/api/models';

type ModelFormProps = {
  adapter: AdapterSchema;
  model?: Model;
  onSubmit: (data: CreateModelDto | UpdateModelDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
};

type FieldValue = string | number | boolean | undefined;

export function ModelForm({ adapter, model, onSubmit, onCancel, isLoading }: ModelFormProps) {
  const [name, setName] = useState(model?.name ?? '');
  const [description, setDescription] = useState(model?.description ?? '');
  const [isActive, setIsActive] = useState(model?.isActive ?? true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<string[]>([]);

  const initialValues = useMemo(() => {
    const values: Record<string, FieldValue> = {};
    Object.entries(adapter.parameters).forEach(([key, definition]) => {
      const current = model?.parameters?.[key];
      if (current !== undefined && current !== null) {
        values[key] = current as FieldValue;
      } else if (definition.default !== undefined) {
        values[key] = definition.default as FieldValue;
      } else {
        values[key] = definition.type === 'boolean' ? false : '';
      }
    });
    return values;
  }, [adapter, model]);

  const [values, setValues] = useState<Record<string, FieldValue>>(initialValues);

  const updateValue = (key: string, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    const nextErrors: string[] = [];
    Object.entries(adapter.parameters).forEach(([key, definition]) => {
      const value = values[key];
      if (!definition.required) {
        return;
      }
      if (definition.type === 'boolean') {
        return;
      }
      if (value === undefined || value === null || value === '') {
        nextErrors.push(`${definition.label} is required`);
      }
    });
    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const buildParameters = (): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    Object.entries(adapter.parameters).forEach(([key, definition]) => {
      const value = values[key];
      if (value === undefined || value === null || value === '') {
        return;
      }
      if (definition.type === 'number' && typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          result[key] = parsed;
        }
        return;
      }
      result[key] = value;
    });
    return result;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    const parameters = buildParameters();
    if (model) {
      const data: UpdateModelDto = {
        name,
        description: description || undefined,
        parameters,
        isActive,
      };
      await onSubmit(data);
      return;
    }
    const data: CreateModelDto = {
      name,
      adapterType: adapter.type,
      description: description || undefined,
      parameters,
      isActive,
    };
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="model-name" className="block text-sm font-medium text-gray-700">
            Name *
          </label>
          <input
            id="model-name"
            type="text"
            aria-label="Model name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            id="model-active"
            type="checkbox"
            aria-label="Model active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="model-active" className="text-sm text-gray-700">
            Active
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="model-description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <input
          id="model-description"
          type="text"
          aria-label="Model description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Object.entries(adapter.parameters).map(([key, definition]) => {
          const fieldId = `model-param-${key}`;
          const value = values[key];
          const isSecret = Boolean(definition.secret);
          const isNumber = definition.type === 'number';
          const isBoolean = definition.type === 'boolean';
          const isEnum = definition.type === 'enum';

          return (
            <div key={key} className="flex flex-col">
              <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
                {definition.label}
                {definition.required ? ' *' : ''}
              </label>

              {isBoolean && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id={fieldId}
                    type="checkbox"
                    aria-label={`${definition.label} enabled`}
                    checked={Boolean(value)}
                    onChange={(e) => updateValue(key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-600">Enabled</span>
                </div>
              )}

              {isEnum && (
                <select
                  id={fieldId}
                  aria-label={definition.label}
                  value={String(value ?? '')}
                  onChange={(e) => updateValue(key, e.target.value)}
                  className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  {(definition.validation?.enum ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}

              {!isBoolean && !isEnum && (
                <div className="relative">
                  <input
                    id={fieldId}
                    type={isSecret && !showSecrets[key] ? 'password' : isNumber ? 'number' : 'text'}
                    aria-label={definition.label}
                    value={value === undefined ? '' : String(value)}
                    onChange={(e) => updateValue(key, e.target.value)}
                    placeholder={definition.placeholder ?? ''}
                    min={definition.validation?.min}
                    max={definition.validation?.max}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                  {isSecret && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      className="absolute right-2 top-3 text-xs text-gray-500"
                      aria-pressed={Boolean(showSecrets[key])}
                      aria-label="Toggle secret visibility"
                      aria-controls={fieldId}
                    >
                      {showSecrets[key] ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
              )}

              {definition.helpText && (
                <span className="mt-1 text-xs text-gray-500">{definition.helpText}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : model ? 'Update Model' : 'Create Model'}
        </button>
      </div>
    </form>
  );
}
