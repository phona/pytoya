import { InternalServerErrorException } from '@nestjs/common';
import { ExtractionService } from './extraction.service';

describe('ExtractionService', () => {
  const buildService = (llmServiceOverrides?: { createChatCompletion?: jest.Mock }) => {
    const llmService = {
      createChatCompletion: jest.fn(),
      ...llmServiceOverrides,
    };

    return new ExtractionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      llmService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  };

  it('returns optimized prompt text', async () => {
    const service = buildService({
      createChatCompletion: jest.fn().mockResolvedValue({ content: ' Optimized ' }),
    });

    const result = await service.optimizePrompt('test description');

    expect(result.prompt).toBe('Optimized');
  });

  it('throws a friendly error when LLM fails', async () => {
    const service = buildService({
      createChatCompletion: jest.fn().mockRejectedValue(new Error('LLM down')),
    });

    await expect(service.optimizePrompt('test description')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
