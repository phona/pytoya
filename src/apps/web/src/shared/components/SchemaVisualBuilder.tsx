'use client';

import { useState, useCallback, useId } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { canonicalizeJsonSchemaForDisplay } from '@/shared/utils/schema';

type SchemaFieldType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getTypes = (schema: Record<string, unknown>): string[] => {
  const typeValue = schema.type;
  if (Array.isArray(typeValue)) {
    return typeValue.filter((value): value is string => typeof value === 'string');
  }
  if (typeof typeValue === 'string') {
    return [typeValue];
  }
  return [];
};

const pickFieldType = (schema: Record<string, unknown>): SchemaFieldType => {
  const types = getTypes(schema);
  const typeSet = new Set(types);

  if (typeSet.has('array') || 'items' in schema) return 'array';
  if (typeSet.has('object') || 'properties' in schema) return 'object';
  if (typeSet.has('string')) return 'string';
  if (typeSet.has('integer')) return 'integer';
  if (typeSet.has('number')) return 'number';
  if (typeSet.has('boolean')) return 'boolean';

  return 'string';
};

const getItemsSchema = (schema: Record<string, unknown>): Record<string, unknown> | null => {
  const items = schema.items;
  if (!items) return null;
  if (Array.isArray(items)) {
    const firstRecord = items.find(isRecord);
    return firstRecord ? (firstRecord as Record<string, unknown>) : null;
  }
  return isRecord(items) ? (items as Record<string, unknown>) : null;
};

interface PropertyField {
  name: string;
  type: SchemaFieldType;
  description: string;
  extractionHint: string;
  required: boolean;
  itemType: string;
  schema: Record<string, unknown>;
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
  label?: string;
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
    extractionHint: '',
    required: false,
    itemType: 'string',
    schema: {},
    format: '',
    pattern: '',
    enum: '',
    minimum: '',
    maximum: '',
    minLength: '',
    maxLength: '',
  };
}

export function SchemaVisualBuilder({ schema, onChange, label }: SchemaVisualBuilderProps) {
  const idPrefix = useId();
  const [properties, setProperties] = useState<PropertyField[]>(() => {
    const orderedSchema = canonicalizeJsonSchemaForDisplay(schema);
    const props = orderedSchema.properties as Record<string, unknown> | undefined;
    const required = (orderedSchema.required as string[]) || [];

    if (!props) return [];

    return Object.entries(props).map(([name, propDef]) => {
      const prop = propDef as Record<string, unknown>;
      const type = pickFieldType(prop);
      const itemsSchema = type === 'array' ? getItemsSchema(prop) : null;
      return {
        name,
        type,
        description: (prop.description as string) || '',
        extractionHint: typeof prop['x-extraction-hint'] === 'string' ? prop['x-extraction-hint'] : '',
        required: required.includes(name),
        itemType: itemsSchema ? pickFieldType(itemsSchema) : 'string',
        schema: prop,
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
  const [expandedFields, setExpandedFields] = useState<Set<string>>(() => new Set());

  const toggleExpanded = (fieldName: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  };

  const updateSchema = useCallback((newProperties: PropertyField[]) => {
    const newSchemaProperties: Record<string, unknown> = {};
    const requiredFields: string[] = [];

    for (const [order, field] of newProperties.entries()) {
      if (!field.name) continue;

      const prevType = pickFieldType(field.schema);
      const propDef: Record<string, unknown> = prevType === field.type ? { ...field.schema } : {};

      propDef.type = field.type;
      propDef['x-ui-order'] = order;

      if (field.description) {
        propDef.description = field.description;
      } else {
        delete propDef.description;
      }

      const hint = field.extractionHint.trim();
      if (hint) {
        propDef['x-extraction-hint'] = hint;
      } else {
        delete propDef['x-extraction-hint'];
      }

      if (field.type === 'string') {
        if (field.format) {
          propDef.format = field.format;
        } else {
          delete propDef.format;
        }

        if (field.pattern) {
          propDef.pattern = field.pattern;
        } else {
          delete propDef.pattern;
        }

        if (field.enum) {
          propDef.enum = field.enum
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        } else {
          delete propDef.enum;
        }

        if (field.minLength !== '') {
          propDef.minLength = Number.parseInt(field.minLength || '0', 10);
        } else {
          delete propDef.minLength;
        }

        if (field.maxLength !== '') {
          propDef.maxLength = Number.parseInt(field.maxLength || '0', 10);
        } else {
          delete propDef.maxLength;
        }
      } else {
        delete propDef.format;
        delete propDef.pattern;
        delete propDef.enum;
        delete propDef.minLength;
        delete propDef.maxLength;
      }

      if (field.type === 'number' || field.type === 'integer') {
        if (field.minimum !== '') {
          propDef.minimum = Number.parseFloat(field.minimum || '0');
        } else {
          delete propDef.minimum;
        }

        if (field.maximum !== '') {
          propDef.maximum = Number.parseFloat(field.maximum || '0');
        } else {
          delete propDef.maximum;
        }
      } else {
        delete propDef.minimum;
        delete propDef.maximum;
      }

      if (field.type === 'array') {
        const existingItems = prevType === 'array' ? getItemsSchema(propDef) : null;
        const prevItemsType = existingItems ? pickFieldType(existingItems) : null;

        const nextItems: Record<string, unknown> = prevItemsType === field.itemType && existingItems
          ? { ...existingItems }
          : { type: field.itemType || 'string' };

        if (nextItems.type === 'object') {
          if (!isRecord(nextItems.properties)) {
            nextItems.properties = {};
          }
          if (!Array.isArray(nextItems.required)) {
            nextItems.required = [];
          }
        }

        propDef.items = nextItems;
      } else {
        delete propDef.items;
      }

      if (field.type === 'object') {
        if (!isRecord(propDef.properties)) {
          propDef.properties = {};
        }
        if (!Array.isArray(propDef.required)) {
          propDef.required = [];
        }
      } else {
        delete propDef.properties;
        delete propDef.required;
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

  const moveProperty = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= properties.length) {
      return;
    }

    const updated = [...properties];
    const [moved] = updated.splice(index, 1);
    updated.splice(nextIndex, 0, moved);
    setProperties(updated);
    updateSchema(updated);
  };

  const handleAddField = () => {
    if (!newField.name) return;

    const updated = [...properties, { ...newField }];
    setProperties(updated);
    updateSchema(updated);
    setNewField(getDefaultField());
    setShowAddForm(false);
  };

  const handleUpdateField = (index: number) => {
    const prevName = properties[index]?.name ?? '';
    const updated = [...properties];
    updated[index] = { ...newField };
    setProperties(updated);
    updateSchema(updated);

    if (prevName && prevName !== newField.name) {
      setExpandedFields((prev) => {
        if (!prev.has(prevName)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(prevName);
        next.add(newField.name);
        return next;
      });
    }

    setEditingIndex(null);
    setNewField(getDefaultField());
  };

  const handleDeleteField = (index: number) => {
    const deletedName = properties[index]?.name ?? '';
    const updated = properties.filter((_, i) => i !== index);
    setProperties(updated);
    updateSchema(updated);
    if (deletedName) {
      setExpandedFields((prev) => {
        if (!prev.has(deletedName)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(deletedName);
        return next;
      });
    }
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setNewField({ ...properties[index] });
  };

  const updateFieldSchema = (fieldName: string, updater: (field: PropertyField) => PropertyField) => {
    setProperties((prev) => {
      const updated = prev.map((field) => (field.name === fieldName ? updater(field) : field));
      updateSchema(updated);
      return updated;
    });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setNewField(getDefaultField());
    setShowAddForm(false);
  };

  const nameFieldId = `${idPrefix}-field-name`;
  const typeFieldId = `${idPrefix}-field-type`;
  const itemTypeFieldId = `${idPrefix}-field-item-type`;
  const descriptionFieldId = `${idPrefix}-field-description`;
  const formatFieldId = `${idPrefix}-field-format`;
  const patternFieldId = `${idPrefix}-field-pattern`;
  const enumFieldId = `${idPrefix}-field-enum`;
  const minLengthFieldId = `${idPrefix}-field-minlength`;
  const maxLengthFieldId = `${idPrefix}-field-maxlength`;
  const minimumFieldId = `${idPrefix}-field-minimum`;
  const maximumFieldId = `${idPrefix}-field-maximum`;
  const requiredFieldId = `${idPrefix}-field-required`;
  const extractionHintFieldId = `${idPrefix}-field-extraction-hint`;

  return (
    <div
      className="schema-visual-builder"
      aria-label={label ? `Visual schema builder: ${label}` : 'Visual schema builder'}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-foreground">
          {label ? `Properties for ${label} (${properties.length})` : `Properties (${properties.length})`}
        </h3>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded hover:bg-primary/90"
        >
          Add Property
        </button>
      </div>

      {(showAddForm || editingIndex !== null) && (
        <div className="mb-4 p-4 bg-background rounded-lg border border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">
            {editingIndex !== null ? 'Edit Property' : 'Add New Property'}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={nameFieldId} className="block text-xs font-medium text-foreground mb-1">
                Name *
              </label>
              <input
                id={nameFieldId}
                type="text"
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring"
                placeholder="field_name"
              />
            </div>

            <div>
              <label htmlFor={typeFieldId} className="block text-xs font-medium text-foreground mb-1">
                Type *
              </label>
              <select
                id={typeFieldId}
                value={newField.type}
                onChange={(e) => {
                  const nextType = e.target.value as SchemaFieldType;
                  setNewField((prev) => ({
                    ...prev,
                    type: nextType,
                    itemType: nextType === 'array' ? prev.itemType || 'string' : prev.itemType,
                  }));
                }}
                className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {newField.type === 'array' && (
              <div>
                <label htmlFor={itemTypeFieldId} className="block text-xs font-medium text-foreground mb-1">
                  Items Type *
                </label>
                <select
                  id={itemTypeFieldId}
                  value={newField.itemType}
                  onChange={(e) => setNewField({ ...newField, itemType: e.target.value })}
                  className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring"
                >
                  {TYPE_OPTIONS.filter((opt) => opt.value !== 'array').map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor={descriptionFieldId} className="block text-xs font-medium text-foreground mb-1">
                Description
              </label>
              <input
                id={descriptionFieldId}
                type="text"
                value={newField.description}
                onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring"
                placeholder="Field description"
              />
            </div>

            <div className="col-span-2">
              <label htmlFor={extractionHintFieldId} className="block text-xs font-medium text-foreground mb-1">
                Extraction Hint
              </label>
              <textarea
                id={extractionHintFieldId}
                value={newField.extractionHint}
                onChange={(e) => setNewField({ ...newField, extractionHint: e.target.value })}
                className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring"
                rows={2}
                placeholder="Where to find it + expected format (x-extraction-hint)"
              />
            </div>

            {newField.type === 'string' && (
              <>
                <div>
                  <label htmlFor={formatFieldId} className="block text-xs font-medium text-foreground mb-1">
                    Format
                  </label>
                  <select
                    id={formatFieldId}
                    value={newField.format}
                    onChange={(e) => setNewField({ ...newField, format: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring"
                  >
                    {STRING_FORMATS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={patternFieldId} className="block text-xs font-medium text-foreground mb-1">
                    Pattern (Regex)
                  </label>
                  <input
                    id={patternFieldId}
                    type="text"
                    value={newField.pattern}
                    onChange={(e) => setNewField({ ...newField, pattern: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring font-mono"
                    placeholder="^[A-Z]"
                  />
                </div>

                <div>
                  <label htmlFor={enumFieldId} className="block text-xs font-medium text-foreground mb-1">
                    Enum (comma-separated)
                  </label>
                  <input
                    id={enumFieldId}
                    type="text"
                    value={newField.enum}
                    onChange={(e) => setNewField({ ...newField, enum: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring"
                    placeholder="value1, value2, value3"
                  />
                </div>

                <div>
                  <label htmlFor={minLengthFieldId} className="block text-xs font-medium text-foreground mb-1">
                    Min Length
                  </label>
                  <input
                    id={minLengthFieldId}
                    type="number"
                    value={newField.minLength}
                    onChange={(e) => setNewField({ ...newField, minLength: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label htmlFor={maxLengthFieldId} className="block text-xs font-medium text-foreground mb-1">
                    Max Length
                  </label>
                  <input
                    id={maxLengthFieldId}
                    type="number"
                    value={newField.maxLength}
                    onChange={(e) => setNewField({ ...newField, maxLength: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring"
                    placeholder="100"
                  />
                </div>
              </>
            )}

            {newField.type === 'number' || newField.type === 'integer' ? (
              <>
                <div>
                  <label htmlFor={minimumFieldId} className="block text-xs font-medium text-foreground mb-1">
                    Minimum
                  </label>
                  <input
                    id={minimumFieldId}
                    type="number"
                    value={newField.minimum}
                    onChange={(e) => setNewField({ ...newField, minimum: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label htmlFor={maximumFieldId} className="block text-xs font-medium text-foreground mb-1">
                    Maximum
                  </label>
                  <input
                    id={maximumFieldId}
                    type="number"
                    value={newField.maximum}
                    onChange={(e) => setNewField({ ...newField, maximum: e.target.value })}
                    className="block w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-ring focus:border-ring"
                    placeholder="100"
                  />
                </div>
              </>
            ) : null}

            <div className="flex items-end">
              <label htmlFor={requiredFieldId} className="flex items-center gap-2 text-xs text-foreground">
                <input
                  id={requiredFieldId}
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-ring"
                />
                Required field
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => editingIndex !== null ? handleUpdateField(editingIndex) : handleAddField()}
              disabled={!newField.name}
              className="px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingIndex !== null ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No properties defined yet. Click &quot;Add Property&quot; to start building your schema.
        </div>
      ) : (
        <div className="space-y-2">
          {properties.map((field, index) => (
            <div
              key={field.name || index}
              className="bg-card border border-border rounded hover:border-primary/40 transition"
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {(field.type === 'object' || (field.type === 'array' && field.itemType === 'object')) && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(field.name)}
                        className="p-1 text-muted-foreground hover:text-primary hover:bg-muted rounded"
                        title={`${expandedFields.has(field.name) ? 'Collapse' : 'Expand'} ${field.name}`}
                      >
                        {expandedFields.has(field.name) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <span className="font-mono text-sm font-medium text-primary">
                      {field.name}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {field.type === 'array' ? `${field.itemType}[]` : field.type}
                    </span>
                    {field.required && (
                      <span className="text-xs text-destructive bg-destructive/10 px-1.5 py-0.5 rounded font-medium">
                        required
                      </span>
                    )}
                    {field.format && (
                      <span className="text-xs bg-[color:var(--status-processing-bg)] text-[color:var(--status-processing-text)] px-1.5 py-0.5 rounded">
                        {field.format}
                      </span>
                    )}
                  </div>
                  {field.description && (
                    <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                  )}
                  {field.extractionHint.trim() && (
                    <p className="text-xs text-muted-foreground mt-1">
                      hint: {field.extractionHint.trim()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveProperty(index, -1)}
                    disabled={editingIndex !== null || showAddForm || index === 0}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProperty(index, 1)}
                    disabled={editingIndex !== null || showAddForm || index === properties.length - 1}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(index)}
                    disabled={showAddForm || editingIndex !== null}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteField(index)}
                    disabled={showAddForm || editingIndex !== null}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {expandedFields.has(field.name) && field.type === 'object' && (
                <div className="border-t border-border bg-background/40 p-3">
                  <SchemaVisualBuilder
                    schema={field.schema}
                    onChange={(childSchema) => {
                      updateFieldSchema(field.name, (current) => ({
                        ...current,
                        schema: {
                          ...current.schema,
                          ...childSchema,
                          type: 'object',
                          properties: childSchema.properties,
                          required: childSchema.required,
                        },
                      }));
                    }}
                    label={field.name}
                  />
                </div>
              )}

              {expandedFields.has(field.name) && field.type === 'array' && field.itemType === 'object' && (
                <div className="border-t border-border bg-background/40 p-3">
                  <SchemaVisualBuilder
                    schema={getItemsSchema(field.schema) ?? { type: 'object', properties: {}, required: [] }}
                    onChange={(childSchema) => {
                      updateFieldSchema(field.name, (current) => {
                        const existingItems = getItemsSchema(current.schema) ?? {};
                        return {
                          ...current,
                          schema: {
                            ...current.schema,
                            items: {
                              ...existingItems,
                              ...childSchema,
                              type: 'object',
                              properties: childSchema.properties,
                              required: childSchema.required,
                            },
                          },
                        };
                      });
                    }}
                    label={`${field.name}[]`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}




