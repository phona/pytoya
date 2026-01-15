'use client';

import { useMemo } from 'react';

interface SchemaProperty {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  enum?: unknown[];
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

interface SchemaPreviewProps {
  schema: Record<string, unknown>;
  title?: string;
}

function getPropertyType(prop: Record<string, unknown>): string {
  const type = prop.type as string;
  if (prop.enum) {
    return `enum (${type})`;
  }
  if (type === 'array' && prop.items) {
    const items = prop.items as Record<string, unknown>;
    const itemType = (items.type as string) || 'object';
    return `${itemType}[]`;
  }
  return type || 'any';
}

function parseProperties(
  properties: Record<string, unknown>,
  required: string[] = []
): Record<string, SchemaProperty> {
  const result: Record<string, SchemaProperty> = {};

  for (const [name, prop] of Object.entries(properties)) {
    const propDef = prop as Record<string, unknown>;
    result[name] = {
      name,
      type: getPropertyType(propDef),
      description: (propDef.description as string) || undefined,
      required: required.includes(name),
      format: (propDef.format as string) || undefined,
      pattern: (propDef.pattern as string) || undefined,
      minimum: (propDef.minimum as number) || undefined,
      maximum: (propDef.maximum as number) || undefined,
      minLength: (propDef.minLength as number) || undefined,
      maxLength: (propDef.maxLength as number) || undefined,
      enum: (propDef.enum as unknown[]) || undefined,
    };

    if (propDef.type === 'object' && propDef.properties) {
      result[name].properties = parseProperties(
        propDef.properties as Record<string, unknown>,
        propDef.required as string[]
      );
    }

    if (propDef.type === 'array' && propDef.items) {
      const items = propDef.items as Record<string, unknown>;
      result[name].items = {
        name: 'items',
        type: getPropertyType(items),
        description: (items.description as string) || undefined,
      };

      if (items.type === 'object' && items.properties) {
        result[name].items!.properties = parseProperties(
          items.properties as Record<string, unknown>,
          items.required as string[]
        );
      }
    }
  }

  return result;
}

function PropertyTreeNode({ property, depth = 0 }: { property: SchemaProperty; depth?: number }) {
  const indent = depth * 16;

  return (
    <div className="property-node">
      <div
        className="flex items-start gap-2 py-1"
        style={{ paddingLeft: `${indent}px` }}
      >
        <span className="font-mono text-sm text-indigo-600 font-medium">
          {property.name}
        </span>
        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
          {property.type}
        </span>
        {property.required && (
          <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium">
            required
          </span>
        )}
      </div>

      {property.description && (
        <div className="text-xs text-gray-600 ml-2 mt-0.5" style={{ paddingLeft: `${indent}px` }}>
          {property.description}
        </div>
      )}

      {property.format && (
        <div className="text-xs text-gray-500 ml-2" style={{ paddingLeft: `${indent}px` }}>
          format: {property.format}
        </div>
      )}

      {property.pattern && (
        <div className="text-xs text-gray-500 ml-2 font-mono" style={{ paddingLeft: `${indent}px` }}>
          pattern: {property.pattern}
        </div>
      )}

      {property.enum && (
        <div className="text-xs text-gray-500 ml-2" style={{ paddingLeft: `${indent}px` }}>
          enum: [{property.enum.map(String).join(', ')}]
        </div>
      )}

      {property.properties && (
        <div className="mt-1">
          {Object.values(property.properties).map((prop) => (
            <PropertyTreeNode key={prop.name} property={prop} depth={depth + 1} />
          ))}
        </div>
      )}

      {property.items && (
        <div className="mt-1">
          <div className="text-xs text-gray-500 italic" style={{ paddingLeft: `${indent + 16}px` }}>
            Array items:
          </div>
          {property.items.properties && (
            <div>
              {Object.values(property.items.properties).map((prop) => (
                <PropertyTreeNode key={prop.name} property={prop} depth={depth + 2} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SchemaPreview({ schema, title }: SchemaPreviewProps) {
  const properties = useMemo(() => {
    const props = schema.properties as Record<string, unknown> | undefined;
    const required = (schema.required as string[]) || [];
    return props ? parseProperties(props, required) : {};
  }, [schema]);

  const propertyCount = Object.keys(properties).length;

  return (
    <div className="schema-preview">
      {title && (
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      )}

      {propertyCount === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500">
          <svg
            className="mx-auto h-10 w-10 text-gray-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          No properties defined
        </div>
      ) : (
        <div className="border rounded-lg bg-gray-50 p-4">
          <div className="text-xs text-gray-500 mb-2">
            {propertyCount} {propertyCount === 1 ? 'property' : 'properties'} defined
          </div>
          {Object.values(properties).map((property) => (
            <PropertyTreeNode key={property.name} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
