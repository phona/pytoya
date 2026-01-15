'use client';

import { useState, useEffect } from 'react';
import { Prompt, CreatePromptDto, UpdatePromptDto, promptsApi, PromptType } from '@/lib/api/prompts';

interface PromptEditorProps {
  prompt?: Prompt;
  onSubmit: (data: CreatePromptDto | UpdatePromptDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const AVAILABLE_VARIABLES = [
  { name: '{{ocr_markdown}}', description: 'OCR result in markdown format' },
  { name: '{{previous_result}}', description: 'Previous extraction result for re-extraction' },
  { name: '{{field_name}}', description: 'Field name for re-extraction' },
  { name: '{{current_value}}', description: 'Current value for re-extraction' },
];

export function PromptEditor({ prompt, onSubmit, onCancel, isLoading }: PromptEditorProps) {
  const [name, setName] = useState(prompt?.name ?? '');
  const [type, setType] = useState<PromptType>(prompt?.type ?? 'system');
  const [content, setContent] = useState(prompt?.content ?? '');

  const insertVariable = (variable: string) => {
    setContent((prev) => prev + variable);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Extract variables from content
    const variableRegex = /\{\{(\w+)\}\}/g;
    const foundVariables: string[] = [];
    let match;
    while ((match = variableRegex.exec(content)) !== null) {
      foundVariables.push(match[1]);
    }

    if (prompt) {
      const data: UpdatePromptDto = {};
      if (name) data.name = name;
      if (content) data.content = content;
      if (foundVariables.length > 0) data.variables = foundVariables;
      await onSubmit(data);
    } else {
      const data: CreatePromptDto = {
        name,
        type,
        content,
        variables: foundVariables.length > 0 ? foundVariables : undefined,
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
            onChange={(e) => setType(e.target.value as PromptType)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="system">System Prompt</option>
            <option value="re_extract">Re-extraction Prompt</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content *
        </label>
        <textarea
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono text-sm"
          placeholder="Enter your prompt template here..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Available Variables (click to insert)
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES.map((variable) => (
            <button
              key={variable.name}
              type="button"
              onClick={() => insertVariable(variable.name)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
              title={variable.description}
            >
              {variable.name}
            </button>
          ))}
        </div>
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
          {isLoading ? 'Saving...' : prompt ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
