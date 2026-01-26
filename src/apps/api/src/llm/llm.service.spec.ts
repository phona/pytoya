import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AxiosInstance } from 'axios';
import { Readable } from 'node:stream';

import { LlmService } from './llm.service';

// Mock axios instance
const mockAxiosInstance = {
  post: jest.fn(),
};

// Mock the constant injection token
const mockAxiosProvider = {
  provide: 'LLM_AXIOS_INSTANCE',
  useValue: mockAxiosInstance,
};

describe('LlmService - Vision Support', () => {
  let service: LlmService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        mockAxiosProvider,
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    configService = module.get(ConfigService);

    // Set default config values
    configService.get.mockImplementation((key: string) => {
      const defaults: Record<string, unknown> = {
        NODE_ENV: 'test',
        LLM_BASE_URL: 'https://api.openai.com/v1',
        LLM_MODEL: 'gpt-4o',
        LLM_TIMEOUT: 30000,
        LLM_TEMPERATURE: 0.1,
        LLM_MAX_TOKENS: 2000,
      };
      return defaults[key] ?? null;
    });

    // Mock successful axios response
    (mockAxiosInstance.post as jest.Mock).mockResolvedValue({
      data: {
        id: 'test-response',
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '{"test": "data"}',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    });
  });

  describe('providerSupportsVision', () => {
    it('should return true for OpenAI GPT-4o models', () => {
      const result = service.providerSupportsVision(
        'openai',
        'gpt-4o',
      );
      expect(result).toBe(true);
    });

    it('should return true for OpenAI GPT-4o-mini models', () => {
      const result = service.providerSupportsVision(
        'openai',
        'gpt-4o-mini',
      );
      expect(result).toBe(true);
    });

    it('should return true for OpenAI GPT-4 Turbo models', () => {
      const result = service.providerSupportsVision(
        'openai',
        'gpt-4-turbo',
      );
      expect(result).toBe(true);
    });

    it('should return true for OpenAI models with "vision" in name', () => {
      const result = service.providerSupportsVision(
        'openai',
        'gpt-4-vision-preview',
      );
      expect(result).toBe(true);
    });

    it('should return false for non-vision OpenAI models', () => {
      const result = service.providerSupportsVision(
        'openai',
        'gpt-3.5-turbo',
      );
      expect(result).toBe(false);
    });

    it('should return false for PADDLEX provider', () => {
      const result = service.providerSupportsVision(
        'paddlex',
        undefined,
      );
      expect(result).toBe(false);
    });

    it('should return false for CUSTOM provider', () => {
      const result = service.providerSupportsVision(
        'custom',
        undefined,
      );
      expect(result).toBe(false);
    });

    it('should use default model when model is undefined', () => {
      const result = service.providerSupportsVision('openai');
      expect(result).toBe(true); // default is gpt-4o
    });
  });

  describe('streamed chat completions', () => {
    it('aggregates streamed output and preserves usage when provided', async () => {
      const stream = Readable.from([
        'data: {"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"Hello "}}]}\n\n',
        'data: {"choices":[{"index":0,"delta":{"content":"world"}}]}\n\n',
        'data: {"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3},"choices":[{"index":0,"delta":{}}]}\n\n',
        'data: [DONE]\n\n',
      ]);

      (mockAxiosInstance.post as jest.Mock).mockResolvedValueOnce({
        data: stream,
      });

      const result = await service.createChatCompletion(
        [{ role: 'user', content: 'hi' }],
        {},
        { type: 'openai', apiKey: 'test-api-key' },
      );

      expect(result.content).toBe('Hello world');
      expect(result.usage).toEqual({
        prompt_tokens: 1,
        completion_tokens: 2,
        total_tokens: 3,
      });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({ stream: true }),
        expect.objectContaining({ responseType: 'stream' }),
      );
    });

    it('does not fall back to non-stream when stream fails before output', async () => {
      (mockAxiosInstance.post as jest.Mock).mockRejectedValueOnce(
        new Error('stream not supported'),
      );

      await expect(
        service.createChatCompletion(
          [{ role: 'user', content: 'ping' }],
          {},
          { type: 'openai', apiKey: 'test-api-key' },
        ),
      ).rejects.toThrow('LLM request failed');

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });
  });

});
