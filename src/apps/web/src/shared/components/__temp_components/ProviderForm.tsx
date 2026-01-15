'use client';

import { useState } from 'react';
import { Provider, CreateProviderDto, UpdateProviderDto, providersApi, ProviderType } from '@/lib/api/providers';

interface ProviderFormProps {
  provider?: Provider;
  onSubmit: (data: CreateProviderDto | UpdateProviderDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProviderForm({ provider, onSubmit, onCancel, isLoading }: ProviderFormProps) {
  const [name, setName] = useState(provider?.name ?? '');
  const [type, setType] = useState<ProviderType>(provider?.type ?? 'OPENAI');
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? '');
  const [apiKey, setApiKey] = useState(provider?.apiKey ?? '');
  const [modelName, setModelName] = useState(provider?.modelName ?? '');
  const [temperature, setTemperature] = useState(provider?.temperature?.toString() ?? '');
  const [maxTokens, setMaxTokens] = useState(provider?.maxTokens?.toString() ?? '');
  const [supportsVision, setSupportsVision] = useState(provider?.supportsVision ?? false);
  const [supportsStructuredOutput, setSupportsStructuredOutput] = useState(provider?.supportsStructuredOutput ?? false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (provider) {
      const data: UpdateProviderDto = {};
      if (name) data.name = name;
      if (baseUrl) data.baseUrl = baseUrl;
      if (apiKey) data.apiKey = apiKey;
      if (modelName) data.modelName = modelName;
      if (temperature) data.temperature = parseFloat(temperature);
      if (maxTokens) data.maxTokens = parseInt(maxTokens, 10);
      data.supportsVision = supportsVision;
      data.supportsStructuredOutput = supportsStructuredOutput;
      await onSubmit(data);
    } else {
      const data: CreateProviderDto = {
        name,
        type,
        baseUrl,
        apiKey,
        modelName: modelName || undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
        supportsVision,
        supportsStructuredOutput,
      };
      await onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Type *</label>
          <select
            required
            value={type}
            onChange={(e) => setType(e.target.value as ProviderType)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="OPENAI">OpenAI-Compatible</option>
            <option value="PADDLEX">PaddleX</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Base URL *</label>
        <input
          type="url"
          required
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">API Key *</label>
        <input
          type="password"
          required
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Model Name</label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="gpt-4"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="0.7"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Max Tokens</label>
        <input
          type="number"
          min="1"
          value={maxTokens}
          onChange={(e) => setMaxTokens(e.target.value)}
          placeholder="4096"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">Capabilities</label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={supportsVision}
              onChange={(e) => setSupportsVision(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Supports Vision</span>
            <span className="ml-2 text-xs text-gray-500">(can process images directly)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={supportsStructuredOutput}
              onChange={(e) => setSupportsStructuredOutput(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Supports Structured Output</span>
            <span className="ml-2 text-xs text-gray-500">(JSON schema enforcement)</span>
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Enable capabilities based on your provider. Vision allows direct image processing. Structured output ensures JSON schema compliance.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : provider ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
