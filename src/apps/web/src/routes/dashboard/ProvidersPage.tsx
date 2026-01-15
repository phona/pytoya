import { useState } from 'react';
import { providersApi, Provider, CreateProviderDto, UpdateProviderDto } from '@/api/providers';
import { ProviderForm } from '@/shared/components/ProviderForm';

export function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const data = await providersApi.listProviders();
      setProviders(data);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useState(() => {
    loadProviders();
  });

  const handleCreate = async (data: CreateProviderDto) => {
    setIsSaving(true);
    try {
      await providersApi.createProvider(data);
      setShowForm(false);
      loadProviders();
    } catch (error) {
      console.error('Failed to create provider:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: UpdateProviderDto) => {
    if (!editingProvider) return;
    setIsSaving(true);
    try {
      await providersApi.updateProvider(editingProvider.id, data);
      setEditingProvider(null);
      setShowForm(false);
      loadProviders();
    } catch (error) {
      console.error('Failed to update provider:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this provider?')) return;
    try {
      await providersApi.deleteProvider(id);
      loadProviders();
    } catch (error) {
      console.error('Failed to delete provider:', error);
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const result = await providersApi.testConnection(id);
      alert(result.message);
    } catch (error) {
      alert('Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleFormSubmit = async (data: CreateProviderDto | UpdateProviderDto) => {
    if (editingProvider) {
      await handleUpdate(data as UpdateProviderDto);
    } else {
      await handleCreate(data as CreateProviderDto);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">LLM Providers</h1>
            <p className="mt-1 text-sm text-gray-600">
              {providers.length} {providers.length === 1 ? 'provider' : 'providers'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingProvider(null);
            }}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            New Provider
          </button>
        </div>

        {(showForm || editingProvider) && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingProvider ? 'Edit Provider' : 'Create New Provider'}
            </h2>
            <ProviderForm
              provider={editingProvider ?? undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingProvider(null);
              }}
              isLoading={isSaving}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capabilities</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {providers.map((provider) => (
                  <tr key={provider.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{provider.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        {provider.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{provider.modelName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-1">
                        {provider.supportsVision && (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800" title="Can process images">
                            Vision
                          </span>
                        )}
                        {provider.supportsStructuredOutput && (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800" title="JSON schema enforcement">
                            Structured
                          </span>
                        )}
                        {!provider.supportsVision && !provider.supportsStructuredOutput && (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Standard
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleTest(provider.id)}
                        disabled={testingId === provider.id}
                        className="text-indigo-600 hover:text-indigo-900 mr-4 disabled:opacity-50"
                      >
                        {testingId === provider.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingProvider(provider);
                          setShowForm(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {providers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No providers configured. Create one to get started.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
