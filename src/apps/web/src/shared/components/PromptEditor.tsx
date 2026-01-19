'use client';

import { useState } from 'react';
import { Prompt, CreatePromptDto, UpdatePromptDto, PromptType } from '@/api/prompts';

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
  const [type, setType] = useState<PromptType>(
    prompt?.type ?? ('system' as PromptType),
  );
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
          <label htmlFor="promptName" className="block text-sm font-medium text-foreground">
            Name *
          </label>
          <input
            id="promptName"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="promptType" className="block text-sm font-medium text-foreground">
            Type *
          </label>
          <select
            id="promptType"
            required
            value={type}
            onChange={(e) => setType(e.target.value as PromptType)}
            className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
          >
            <option value="system">System Prompt</option>
            <option value="re_extract">Re-extraction Prompt</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="promptContent" className="block text-sm font-medium text-foreground mb-2">
          Content *
        </label>
        <textarea
          id="promptContent"
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm font-mono text-sm"
          placeholder="Enter your prompt template here..."
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-foreground mb-2">
          Available Variables (click to insert)
        </p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES.map((variable) => (
            <button
              key={variable.name}
              type="button"
              onClick={() => insertVariable(variable.name)}
              className="px-3 py-1 text-xs bg-muted hover:bg-muted rounded-md text-foreground transition-colors"
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
          className="px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : prompt ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}




