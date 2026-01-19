import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { promptsApi, type Prompt, type CreatePromptDto, type UpdatePromptDto } from './prompts';
import { server } from '../tests/mocks/server';
import { http, HttpResponse } from 'msw';

const mockPrompt: Prompt = {
  id: 1,
  name: 'Test Prompt',
  type: 'invoice',
  content: 'Test content with {{variable}}',
  variables: ['variable'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('promptsApi', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('listPrompts', () => {
    it('should return list of prompts', async () => {
      const result = await promptsApi.listPrompts();

      expect(result).toEqual([
        {
          id: 1,
          name: 'System Prompt',
          type: 'system',
          content: 'Test prompt content with {{variable}}',
          variables: ['variable'],
          createdAt: '2025-01-13T00:00:00.000Z',
          updatedAt: '2025-01-13T00:00:00.000Z',
        },
      ]);
    });

    it('should handle empty list', async () => {
      server.use(
        http.get('/api/prompts', () => {
          return HttpResponse.json([]);
        })
      );

      const result = await promptsApi.listPrompts();

      expect(result).toEqual([]);
    });
  });

  describe('getPrompt', () => {
    it('should return single prompt by id', async () => {
      const result = await promptsApi.getPrompt(1);

      expect(result).toEqual({
        id: 1,
        name: 'Test Prompt',
        type: 'invoice',
        content: 'Test content {{field}}',
        variables: ['field'],
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      });
    });

    it('should handle not found error', async () => {
      await expect(promptsApi.getPrompt(999)).rejects.toThrow();
    });
  });

  describe('createPrompt', () => {
    it('should create new prompt', async () => {
      const createDto: CreatePromptDto = {
        name: 'New Prompt',
        type: 'invoice',
        content: 'New content {{var}}',
      };

      const result = await promptsApi.createPrompt(createDto);

      expect(result).toEqual({
        id: 2,
        name: 'New Prompt',
        type: 'invoice',
        content: 'New content {{var}}',
        variables: [],
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      });
    });
  });

  describe('updatePrompt', () => {
    it('should update existing prompt', async () => {
      const updateDto: UpdatePromptDto = {
        name: 'Updated Prompt',
      };

      const result = await promptsApi.updatePrompt(1, updateDto);

      expect(result).toEqual({
        id: 1,
        name: 'Updated Prompt',
        type: 'invoice',
        content: 'Updated content',
        variables: [],
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      });
    });
  });

  describe('deletePrompt', () => {
    it('should delete prompt', async () => {
      await expect(promptsApi.deletePrompt(1)).resolves.not.toThrow();
    });

    it('should handle delete errors', async () => {
      server.use(
        http.delete('/api/prompts/:id', () => {
          return HttpResponse.json({ message: 'Failed to delete' }, { status: 500 });
        })
      );

      await expect(promptsApi.deletePrompt(1)).rejects.toThrow();
    });
  });
});
