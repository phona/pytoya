import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSchema, useValidateSchema } from '@/shared/hooks/use-schemas';
import { UpdateSchemaDto, ValidateSchemaDto } from '@/api/schemas';
import { SchemaForm } from '@/shared/components/SchemaForm';
import { SchemaPreview } from '@/shared/components/SchemaPreview';

export function SchemaDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const schemaId = Number(params.id);
  const { schema, isLoading } = useSchema(schemaId);
  const validateSchema = useValidateSchema();

  const [isEditing, setIsEditing] = useState(false);
  const [testData, setTestData] = useState('{}');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors?: string[] } | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Schema not found</h2>
          <button
            onClick={() => navigate('/schemas')}
            className="mt-4 text-indigo-600 hover:text-indigo-800"
          >
            Back to Schemas
          </button>
        </div>
      </div>
    );
  }

  const handleUpdate = async (_data: UpdateSchemaDto) => {
    // Update logic would be handled by the hook
    setIsEditing(false);
  };

  const handleValidate = async () => {
    try {
      const data = JSON.parse(testData);
      const validateDto: ValidateSchemaDto = {
        jsonSchema: schema.jsonSchema,
        data,
        requiredFields: schema.requiredFields,
      };
      const result = await validateSchema.mutateAsync(validateDto);
      setValidationResult(result);
    } catch {
      setValidationResult({ valid: false, errors: ['Invalid test data JSON'] });
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this schema?')) {
      // Delete logic would go here
      navigate('/schemas');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/schemas')}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-4 inline-block"
          >
            ← Back to Schemas
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{schema.name}</h1>
              <p className="mt-1 text-sm text-gray-600">
                {schema.isTemplate ? 'Template Schema' : `Project ID: ${schema.projectId}`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {isEditing ? 'Cancel Edit' : 'Edit Schema'}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Schema</h2>
            <SchemaForm
              schema={schema}
              templates={[]}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isLoading={false}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Schema Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Schema Information</h2>
              {schema.description && (
                <p className="text-gray-700 mb-4">{schema.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Required Fields:</span>{' '}
                  <span className="text-gray-700">{schema.requiredFields.length}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Created:</span>{' '}
                  <span className="text-gray-700">{new Date(schema.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Updated:</span>{' '}
                  <span className="text-gray-700">{new Date(schema.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* JSON Schema */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">JSON Schema</h2>
              <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-xs">
                {JSON.stringify(schema.jsonSchema, null, 2)}
              </pre>
            </div>

            {/* Schema Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Schema Preview</h2>
              <SchemaPreview schema={schema.jsonSchema as Record<string, unknown>} />
            </div>

            {/* Required Fields */}
            {schema.requiredFields.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Required Fields</h2>
                <ul className="space-y-1">
                  {schema.requiredFields.map((field) => (
                    <li key={field} className="text-sm text-gray-700">
                      <code className="bg-gray-100 px-2 py-1 rounded">{field}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Tester */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Validation</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="testData" className="block text-sm font-medium text-gray-700">
                    Test Data (JSON)
                  </label>
                  <textarea
                    id="testData"
                    value={testData}
                    onChange={(e) => setTestData(e.target.value)}
                    rows={8}
                    className="mt-1 block w-full px-3 py-2 font-mono text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder='{"field": "value"}'
                  />
                </div>
                <button
                  onClick={handleValidate}
                  disabled={validateSchema.isPending}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validateSchema.isPending ? 'Validating...' : 'Validate'}
                </button>

                {validationResult && (
                  <div className={`mt-4 p-4 rounded-md ${
                    validationResult.valid
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`font-medium ${
                      validationResult.valid ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {validationResult.valid ? '✓ Valid' : '✗ Invalid'}
                    </p>
                    {validationResult.errors && validationResult.errors.length > 0 && (
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        {validationResult.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
