import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AxiosInstance } from 'axios';

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
        LLM_API_KEY: 'test-api-key',
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

  describe('createVisionMessage', () => {
    it('should create vision message with data URL', () => {
      const images = ['data:image/png;base64,iVBORw0KGgo...'];
      const text = 'Extract data from this image';

      const result = service.createVisionMessage(text, images);

      expect(result.role).toBe('user');
      expect(Array.isArray(result.content)).toBe(true);
      const contentArray = result.content as Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }>;
      expect(contentArray[0]).toEqual({ type: 'text', text });
      expect(contentArray[1]).toEqual({
        type: 'image_url',
        image_url: {
          url: images[0],
          detail: 'auto',
        },
      });
    });

    it('should create vision message with public URL', () => {
      const images = ['https://example.com/image.png'];
      const text = 'Extract data';

      const result = service.createVisionMessage(text, images);
      const contentArray = result.content as Array<{ type: string; image_url?: { url: string; detail?: string } }>;

      expect(contentArray[1]).toEqual({
        type: 'image_url',
        image_url: {
          url: images[0],
          detail: 'auto',
        },
      });
    });

    it('should create vision message with custom detail level', () => {
      const images = ['data:image/png;base64,abc'];
      const text = 'Extract data';

      const result = service.createVisionMessage(text, images, 'high');
      const contentArray = result.content as Array<{ type: string; image_url?: { url: string; detail?: string } }>;

      expect(contentArray[1]).toEqual({
        type: 'image_url',
        image_url: {
          url: images[0],
          detail: 'high',
        },
      });
    });

    it('should handle multiple images', () => {
      const images = [
        'data:image/png;base64,abc1',
        'data:image/png;base64,abc2',
      ];
      const text = 'Extract data from both images';

      const result = service.createVisionMessage(text, images);
      const contentArray = result.content as Array<{ type: string; image_url?: { url: string } }>;

      expect(contentArray).toHaveLength(3); // text + 2 images
      expect(contentArray[1]).toMatchObject({
        type: 'image_url',
        image_url: { url: images[0] },
      });
      expect(contentArray[2]).toMatchObject({
        type: 'image_url',
        image_url: { url: images[1] },
      });
    });
  });

  describe('createVisionMessageFromBuffers', () => {
    it('should create vision message from image buffers', () => {
      const buffer1 = Buffer.from('fake-image-1');
      const buffer2 = Buffer.from('fake-image-2');
      const imageBuffers = [
        { buffer: buffer1, mimeType: 'image/png' },
        { buffer: buffer2, mimeType: 'image/jpeg' },
      ];
      const text = 'Extract data';

      const result = service.createVisionMessageFromBuffers(text, imageBuffers);

      expect(result.role).toBe('user');
      expect(Array.isArray(result.content)).toBe(true);
      const contentArray = result.content as Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }>;
      expect(contentArray).toHaveLength(3); // text + 2 images

      // Verify text content
      expect(contentArray[0]).toEqual({ type: 'text', text });

      // Verify first image
      expect(contentArray[1]).toMatchObject({
        type: 'image_url',
        image_url: {
          url: expect.stringMatching(/^data:image\/png;base64,/),
          detail: 'auto',
        },
      });
      expect(contentArray[1].image_url?.url).toContain(
        buffer1.toString('base64'),
      );

      // Verify second image
      expect(contentArray[2]).toMatchObject({
        type: 'image_url',
        image_url: {
          url: expect.stringMatching(/^data:image\/jpeg;base64,/),
          detail: 'auto',
        },
      });
      expect(contentArray[2].image_url?.url).toContain(
        buffer2.toString('base64'),
      );
    });

    it('should support custom detail level', () => {
      const buffer = Buffer.from('fake-image');
      const imageBuffers = [{ buffer, mimeType: 'image/png' }];
      const text = 'Extract data';

      const result = service.createVisionMessageFromBuffers(
        text,
        imageBuffers,
        'low',
      );
      const contentArray = result.content as Array<{ type: string; image_url?: { url: string; detail?: string } }>;

      expect(contentArray[1].image_url?.detail).toBe('low');
    });

    it('should handle empty buffer array', () => {
      const result = service.createVisionMessageFromBuffers('Extract data', []);
      const contentArray = result.content as Array<{ type: string; text: string }>;

      expect(contentArray).toHaveLength(1); // only text
      expect(contentArray[0]).toEqual({ type: 'text', text: 'Extract data' });
    });
  });

  describe('MIME type detection', () => {
    it('should detect PNG mime type', () => {
      const buffer = Buffer.from('fake');
      const result = service.createVisionMessageFromBuffers('text', [
        { buffer, mimeType: 'image/png' },
      ]);
      const contentArray = result.content as Array<{ type: string; image_url?: { url: string } }>;

      expect(contentArray[1].image_url?.url).toMatch(
        /^data:image\/png;base64/,
      );
    });

    it('should detect JPEG mime type', () => {
      const buffer = Buffer.from('fake');
      const result = service.createVisionMessageFromBuffers('text', [
        { buffer, mimeType: 'image/jpeg' },
      ]);
      const contentArray = result.content as Array<{ type: string; image_url?: { url: string } }>;

      expect(contentArray[1].image_url?.url).toMatch(
        /^data:image\/jpeg;base64/,
      );
    });

    it('should detect GIF mime type', () => {
      const buffer = Buffer.from('fake');
      const result = service.createVisionMessageFromBuffers('text', [
        { buffer, mimeType: 'image/gif' },
      ]);
      const contentArray = result.content as Array<{ type: string; image_url?: { url: string } }>;

      expect(contentArray[1].image_url?.url).toMatch(
        /^data:image\/gif;base64/,
      );
    });

    it('should detect WebP mime type', () => {
      const buffer = Buffer.from('fake');
      const result = service.createVisionMessageFromBuffers('text', [
        { buffer, mimeType: 'image/webp' },
      ]);
      const contentArray = result.content as Array<{ type: string; image_url?: { url: string } }>;

      expect(contentArray[1].image_url?.url).toMatch(
        /^data:image\/webp;base64/,
      );
    });

    it('should pass through provided MIME type', () => {
      const buffer = Buffer.from('fake');
      const result = service.createVisionMessageFromBuffers('text', [
        { buffer, mimeType: 'image/tiff' },
      ]);
      const contentArray = result.content as Array<{ type: string; image_url?: { url: string } }>;

      // The service passes through the provided MIME type directly
      expect(contentArray[1].image_url?.url).toMatch(
        /^data:image\/tiff;base64/,
      );
    });
  });
});
