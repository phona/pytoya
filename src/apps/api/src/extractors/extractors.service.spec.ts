import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

import { ExtractorsService } from './extractors.service';
import { ExtractorRepository } from './extractor.repository';
import { TextExtractorRegistry } from '../text-extractor/text-extractor.registry';
import { LlmService } from '../llm/llm.service';
import { ProjectEntity } from '../entities/project.entity';

describe('ExtractorsService', () => {
  let service: ExtractorsService;
  let extractorRepository: jest.Mocked<ExtractorRepository>;
  let extractorRegistry: jest.Mocked<TextExtractorRegistry>;

  beforeEach(async () => {
    extractorRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<ExtractorRepository>;

    extractorRegistry = {
      get: jest.fn(),
      list: jest.fn(),
      validateConfig: jest.fn(),
    } as unknown as jest.Mocked<TextExtractorRegistry>;

    const projectRepository = {} as unknown as Repository<ProjectEntity>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExtractorsService,
        { provide: ExtractorRepository, useValue: extractorRepository },
        { provide: TextExtractorRegistry, useValue: extractorRegistry },
        { provide: LlmService, useValue: {} },
        { provide: getRepositoryToken(ProjectEntity), useValue: projectRepository },
      ],
    }).compile();

    service = moduleRef.get(ExtractorsService);
  });

  it('preserves secrets when the masked placeholder is sent', async () => {
    extractorRegistry.get.mockReturnValue({
      metadata: {
        paramsSchema: { apiKey: { type: 'string', required: true, label: 'API Key', secret: true } },
      },
    } as any);
    extractorRegistry.validateConfig.mockReturnValue({ valid: true, errors: [] } as any);

    extractorRepository.findOne.mockResolvedValue({
      id: 'extractor-1',
      name: 'Vision',
      description: null,
      extractorType: 'vision-llm',
      config: { baseUrl: 'https://a', apiKey: 'sk-old', pricing: { mode: 'none' } },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    extractorRepository.update.mockImplementation(async (_id, next) => ({
      ...(await extractorRepository.findOne('extractor-1')),
      ...next,
    }) as any);

    await service.update('extractor-1', {
      config: { baseUrl: 'https://b', apiKey: '********', pricing: { mode: 'none' } },
    });

    expect(extractorRepository.update).toHaveBeenCalledWith(
      'extractor-1',
      expect.objectContaining({
        config: expect.objectContaining({
          baseUrl: 'https://b',
          apiKey: 'sk-old',
        }),
      }),
    );
  });

  it('rejects masked secrets when changing extractor type', async () => {
    extractorRegistry.get.mockReturnValue({
      metadata: {
        paramsSchema: { apiKey: { type: 'string', required: true, label: 'API Key', secret: true } },
      },
    } as any);
    extractorRegistry.validateConfig.mockImplementation((_type, config) => {
      if ((config as any)?.apiKey) {
        return { valid: true, errors: [] } as any;
      }
      return { valid: false, errors: ['apiKey is required'] } as any;
    });

    extractorRepository.findOne.mockResolvedValue({
      id: 'extractor-1',
      name: 'Vision',
      description: null,
      extractorType: 'paddleocr',
      config: { baseUrl: 'http://ocr', pricing: { mode: 'none' } },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await expect(
      service.update('extractor-1', {
        extractorType: 'vision-llm',
        config: { baseUrl: 'https://b', apiKey: '********', pricing: { mode: 'none' } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
