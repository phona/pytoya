import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchemas, useSchemaTemplates } from '@/shared/hooks/use-schemas';
import { CreateSchemaDto, UpdateSchemaDto, Schema } from '@/api/schemas';
import { SchemaForm } from '@/shared/components/SchemaForm';

export function SchemasPage() {
  const navigate = useNavigate();
  const { schemas, isLoading, createSchema, updateSchema, deleteSchema, isCreating, isUpdating, isDeleting } =
    useSchemas();
  const { templates: templateSchemas } = useSchemaTemplates();

  const [showForm, setShowForm] = useState(false);
  const [editingSchema, setEditingSchema] = useState<Schema | null>(null);

  const handleCreate = async (data: CreateSchemaDto) => {
    await createSchema(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: UpdateSchemaDto) => {
    if (editingSchema) {
      await updateSchema({ id: editingSchema.id, data });
      setEditingSchema(null);
    }
  };

  const handleFormSubmit = async (data: CreateSchemaDto | UpdateSchemaDto) => {
    if (editingSchema) {
      await handleUpdate(data as UpdateSchemaDto);
    } else {
      await handleCreate(data as CreateSchemaDto);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this schema?')) {
      await deleteSchema(id);
    }
  };

  const handleEdit = (schema: Schema) => {
    setEditingSchema(schema);
    setShowForm(false);
  };

  const handleDuplicate = async (schema: Schema) => {
    const duplicateData: CreateSchemaDto = {
      name: `${schema.name} (Copy)`,
      jsonSchema: schema.jsonSchema,
      requiredFields: schema.requiredFields,
      projectId: schema.projectId,
      description: schema.description ?? undefined,
      isTemplate: false,
    };
    await createSchema(duplicateData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Schemas</h1>
            <p className="mt-1 text-sm text-gray-600">
              {schemas.length} {schemas.length === 1 ? 'schema' : 'schemas'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingSchema(null);
            }}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            New Schema
          </button>
        </div>

        {templateSchemas.length > 0 && !showForm && !editingSchema && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Schemas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templateSchemas.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition"
                  onClick={() => {
                    setShowForm(true);
                    setEditingSchema({
                      ...template,
                      name: '',
                      id: 0,
                      projectId: 0,
                      isTemplate: false,
                      createdAt: '',
                      updatedAt: '',
                    } as Schema);
                  }}
                >
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{template.description ?? 'Template schema'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(showForm || editingSchema) && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSchema ? 'Edit Schema' : 'Create New Schema'}
            </h2>
            <SchemaForm
              schema={editingSchema ?? undefined}
              templates={templateSchemas}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingSchema(null);
              }}
              isLoading={isCreating || isUpdating}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Loading schemas...</p>
          </div>
        ) : schemas.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No schemas</h3>
            <p className="mt-1 text-sm text-gray-500">Create a schema to define your extraction structure.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Schema
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schemas.map((schema) => (
              <div
                key={schema.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{schema.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {schema.isTemplate ? 'Template' : `Project ID: ${schema.projectId}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/schemas/${schema.id}`)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(schema)}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(schema.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                      disabled={isDeleting}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {schema.description && (
                  <p className="text-sm text-gray-600 mb-4">{schema.description}</p>
                )}
                <div className="text-sm text-gray-500">
                  <p>Required fields: {schema.requiredFields.length}</p>
                  <p>Created: {new Date(schema.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
