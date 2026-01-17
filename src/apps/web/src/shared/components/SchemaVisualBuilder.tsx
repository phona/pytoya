'use client';

import { useState, useCallback } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

interface PropertyField {
  name: string;
  type: string;
  description: string;
  required: boolean;
  array: boolean;
  itemType: string;
  format?: string;
  pattern?: string;
  enum?: string;
  minimum?: string;
  maximum?: string;
  minLength?: string;
  maxLength?: string;
}

interface SchemaVisualBuilderProps {
  schema: Record<string, unknown>;
  onChange: (schema: Record<string, unknown>) => void;
}

const TYPE_OPTIONS = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'integer', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'object', label: 'Object' },
  { value: 'array', label: 'Array' },
];

const STRING_FORMATS = [
  { value: '', label: 'None' },
  { value: 'date', label: 'Date (YYYY-MM-DD)' },
  { value: 'time', label: 'Time (HH:MM:SS)' },
  { value: 'date-time', label: 'DateTime (ISO 8601)' },
  { value: 'email', label: 'Email' },
  { value: 'uri', label: 'URI' },
  { value: 'uuid', label: 'UUID' },
  { value: 'hostname', label: 'Hostname' },
  { value: 'ipv4', label: 'IPv4' },
  { value: 'ipv6', label: 'IPv6' },
];

function getDefaultField(): PropertyField {
  return {
    name: '',
    type: 'string',
    description: '',
    required: false,
    array: false,
    itemType: 'string',
    format: '',
    pattern: '',
    enum: '',
    minimum: '',
    maximum: '',
    minLength: '',
    maxLength: '',
  };
}

export function SchemaVisualBuilder({ schema, onChange }: SchemaVisualBuilderProps) {
  const [properties, setProperties] = useState<PropertyField[]>(() => {
    const props = schema.properties as Record<string, unknown> | undefined;
    const required = (schema.required as string[]) || [];

    if (!props) return [];

    return Object.entries(props).map(([name, propDef]) => {
      const prop = propDef as Record<string, unknown>;
      return {
        name,
        type: (prop.type as string) || 'string',
        description: (prop.description as string) || '',
        required: required.includes(name),
        array: prop.type === 'array',
        itemType: prop.type === 'array' && prop.items
          ? ((prop.items as Record<string, unknown>).type as string) || 'string'
          : 'string',
        format: (prop.format as string) || '',
        pattern: (prop.pattern as string) || '',
        enum: prop.enum ? (prop.enum as unknown[]).join(', ') : '',
        minimum: prop.minimum ? String(prop.minimum) : '',
        maximum: prop.maximum ? String(prop.maximum) : '',
        minLength: prop.minLength ? String(prop.minLength) : '',
        maxLength: prop.maxLength ? String(prop.maxLength) : '',
      };
    });
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newField, setNewField] = useState<PropertyField>(getDefaultField());
  const [showAddForm, setShowAddForm] = useState(false);

  const updateSchema = useCallback((newProperties: PropertyField[]) => {
    const newSchemaProperties: Record<string, unknown> = {};
    const requiredFields: string[] = [];

    for (const field of newProperties) {
      if (!field.name) continue;

      const propDef: Record<string, unknown> = {
        type: field.array ? 'array' : field.type,
        description: field.description || undefined,
      };

      if (field.array) {
        propDef.items = {
          type: field.itemType,
        };
      }

      if (field.format) {
        propDef.format = field.format;
      }

      if (field.pattern) {
        propDef.pattern = field.pattern;
      }

      if (field.enum) {
        propDef.enum = field.enum.split(',').map(s => s.trim());
      }

      if (field.minimum !== '') {
        propDef.minimum = parseFloat(field.minimum || '0');
      }

      if (field.maximum !== '') {
        propDef.maximum = parseFloat(field.maximum || '0');
      }

      if (field.minLength !== '') {
        propDef.minLength = parseInt(field.minLength || '0', 10);
      }

      if (field.maxLength !== '') {
        propDef.maxLength = parseInt(field.maxLength || '0', 10);
      }

      newSchemaProperties[field.name] = propDef;

      if (field.required) {
        requiredFields.push(field.name);
      }
    }

    onChange({
      type: 'object',
      properties: newSchemaProperties,
      required: requiredFields,
    });
  }, [onChange]);

  const handleAddField = () => {
    if (!newField.name) return;

    const updated = [...properties, { ...newField }];
    setProperties(updated);
    updateSchema(updated);
    setNewField(getDefaultField());
    setShowAddForm(false);
  };

  const handleUpdateField = (index: number) => {
    const updated = [...properties];
    updated[index] = { ...newField };
    setProperties(updated);
    updateSchema(updated);
    setEditingIndex(null);
    setNewField(getDefaultField());
  };

  const handleDeleteField = (index: number) => {
    const updated = properties.filter((_, i) => i !== index);
    setProperties(updated);
    updateSchema(updated);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setNewField({ ...properties[index] });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setNewField(getDefaultField());
    setShowAddForm(false);
  };

  return (
    <div className="schema-visual-builder">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-900">
          Properties ({properties.length})
        </h3>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
        >
          Add Property
        </button>
      </div>

      {(showAddForm || editingIndex !== null) && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {editingIndex !== null ? 'Edit Property' : 'Add New Property'}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="schema-field-name" className="block text-xs font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                id="schema-field-name"
                type="text"
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="field_name"
              />
            </div>

            <div>
              <label htmlFor="schema-field-type" className="block text-xs font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                id="schema-field-type"
                value={newField.type}
                onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="schema-field-description" className="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                id="schema-field-description"
                type="text"
                value={newField.description}
                onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Field description"
              />
            </div>

            {newField.type === 'string' && (
              <>
                <div>
                  <label htmlFor="schema-field-format" className="block text-xs font-medium text-gray-700 mb-1">
                    Format
                  </label>
                  <select
                    id="schema-field-format"
                    value={newField.format}
                    onChange={(e) => setNewField({ ...newField, format: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {STRING_FORMATS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="schema-field-pattern" className="block text-xs font-medium text-gray-700 mb-1">
                    Pattern (Regex)
                  </label>
                  <input
                    id="schema-field-pattern"
                    type="text"
                    value={newField.pattern}
                    onChange={(e) => setNewField({ ...newField, pattern: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                    placeholder="^[A-Z]"
                  />
                </div>

                <div>
                  <label htmlFor="schema-field-enum" className="block text-xs font-medium text-gray-700 mb-1">
                    Enum (comma-separated)
                  </label>
                  <input
                    id="schema-field-enum"
                    type="text"
                    value={newField.enum}
                    onChange={(e) => setNewField({ ...newField, enum: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="value1, value2, value3"
                  />
                </div>

                <div>
                  <label htmlFor="schema-field-minlength" className="block text-xs font-medium text-gray-700 mb-1">
                    Min Length
                  </label>
                  <input
                    id="schema-field-minlength"
                    type="number"
                    value={newField.minLength}
                    onChange={(e) => setNewField({ ...newField, minLength: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label htmlFor="schema-field-maxlength" className="block text-xs font-medium text-gray-700 mb-1">
                    Max Length
                  </label>
                  <input
                    id="schema-field-maxlength"
                    type="number"
                    value={newField.maxLength}
                    onChange={(e) => setNewField({ ...newField, maxLength: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="100"
                  />
                </div>
              </>
            )}

            {newField.type === 'number' || newField.type === 'integer' ? (
              <>
                <div>
                  <label htmlFor="schema-field-minimum" className="block text-xs font-medium text-gray-700 mb-1">
                    Minimum
                  </label>
                  <input
                    id="schema-field-minimum"
                    type="number"
                    value={newField.minimum}
                    onChange={(e) => setNewField({ ...newField, minimum: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label htmlFor="schema-field-maximum" className="block text-xs font-medium text-gray-700 mb-1">
                    Maximum
                  </label>
                  <input
                    id="schema-field-maximum"
                    type="number"
                    value={newField.maximum}
                    onChange={(e) => setNewField({ ...newField, maximum: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="100"
                  />
                </div>
              </>
            ) : null}

            <div className="flex items-end">
              <label htmlFor="schema-field-required" className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  id="schema-field-required"
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Required field
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => editingIndex !== null ? handleUpdateField(editingIndex) : handleAddField()}
              disabled={!newField.name}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingIndex !== null ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500">
          No properties defined yet. Click &quot;Add Property&quot; to start building your schema.
        </div>
      ) : (
        <div className="space-y-2">
          {properties.map((field, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:border-indigo-300 transition"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-indigo-600">
                    {field.name}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {field.type}
                  </span>
                  {field.required && (
                    <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium">
                      required
                    </span>
                  )}
                  {field.format && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {field.format}
                    </span>
                  )}
                </div>
                {field.description && (
                  <p className="text-xs text-gray-600 mt-1">{field.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(index)}
                  className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteField(index)}
                  className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
