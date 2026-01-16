import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ModelEntity } from '../entities/model.entity';
import { LlmService } from '../llm/llm.service';
import { OcrService } from '../ocr/ocr.service';
import { ModelsService } from './models.service';

describe('ModelsService', () => {
  let service: ModelsService;
  let modelRepository: jest.Mocked<Repository<ModelEntity>>;
  let llmService: jest.Mocked<LlmService>;
  let ocrService: jest.Mocked<OcrService>;

  beforeEach(async () => {
    modelRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<ModelEntity>>;

    llmService = {
      createChatCompletion: jest.fn(),
    } as unknown as jest.Mocked<LlmService>;

    ocrService = {
      testConnection: jest.fn(),
      processPdf: jest.fn(),
    } as unknown as jest.Mocked<OcrService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelsService,
        { provide: getRepositoryToken(ModelEntity), useValue: modelRepository },
        { provide: LlmService, useValue: llmService },
        { provide: OcrService, useValue: ocrService },
      ],
    }).compile();

    service = module.get<ModelsService>(ModelsService);
  });

  it('creates a model with valid parameters', async () => {
    const dto = {
      name: 'OpenAI GPT-4o',
      adapterType: 'openai',
      parameters: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'test',
        modelName: 'gpt-4o',
      },
    };

    modelRepository.create.mockReturnValue(dto as any);
    modelRepository.save.mockResolvedValue({ id: 'id-1', ...dto } as any);

    const result = await service.create(dto);

    expect(modelRepository.create).toHaveBeenCalled();
    expect(modelRepository.save).toHaveBeenCalled();
    expect(result.id).toBe('id-1');
  });

  it('rejects invalid parameters on create', async () => {
    const dto = {
      name: 'Bad Model',
      adapterType: 'openai',
      parameters: {
        baseUrl: 'https://api.openai.com/v1',
      },
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('requires parameters when changing adapter type', async () => {
    modelRepository.findOne.mockResolvedValue({
      id: 'id-1',
      name: 'Model',
      adapterType: 'openai',
      parameters: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'test',
        modelName: 'gpt-4o',
      },
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ModelEntity);

    await expect(
      service.update('id-1', { adapterType: 'paddlex' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('tests LLM connection', async () => {
    modelRepository.findOne.mockResolvedValue({
      id: 'id-1',
      name: 'OpenAI GPT-4o',
      adapterType: 'openai',
      parameters: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'test',
        modelName: 'gpt-4o',
      },
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ModelEntity);

    llmService.createChatCompletion.mockResolvedValue({
      content: 'ok',
      model: 'gpt-4o',
      usage: {},
      rawResponse: {},
    });

    const result = await service.testConnection('id-1');
    expect(result.ok).toBe(true);
    expect(result.model).toBe('gpt-4o');
  });

  it('tests OCR connection', async () => {
    modelRepository.findOne.mockResolvedValue({
      id: 'id-2',
      name: 'PaddleX OCR',
      adapterType: 'paddlex',
      parameters: {
        baseUrl: 'http://localhost:8080',
      },
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ModelEntity);

    ocrService.testConnection.mockResolvedValue({ ok: true });

    const result = await service.testConnection('id-2');
    expect(result.ok).toBe(true);
    expect(result.message).toBe('OCR connection ok');
  });

  it('filters models by category', async () => {
    modelRepository.find.mockResolvedValue([
      {
        id: 'id-1',
        name: 'OpenAI',
        adapterType: 'openai',
        parameters: {},
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'id-2',
        name: 'PaddleX',
        adapterType: 'paddlex',
        parameters: {},
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.findAll({ category: 'ocr' });

    expect(result).toHaveLength(1);
    expect(result[0].adapterType).toBe('paddlex');
  });
});
