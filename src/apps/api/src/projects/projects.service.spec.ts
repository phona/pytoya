import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectEntity } from '../entities/project.entity';
import { ModelEntity } from '../entities/model.entity';
import { UserEntity } from '../entities/user.entity';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    remove: jest.Mock;
  };
  let modelRepository: { findOne: jest.Mock };
  let manifestRepository: { createQueryBuilder: jest.Mock };
  let extractorRepository: { findOne: jest.Mock };
  const user = { id: 1 } as UserEntity;

  beforeEach(() => {
    projectRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };
    modelRepository = {
      findOne: jest.fn(),
    };
    manifestRepository = {
      createQueryBuilder: jest.fn(),
    };
    extractorRepository = {
      findOne: jest.fn(),
    };
    service = new ProjectsService(
      projectRepository as any,
      modelRepository as any,
      manifestRepository as any,
      extractorRepository as any,
    );
  });

  it('rejects non-LLM model for LLM selection', async () => {
    modelRepository.findOne.mockResolvedValue({
      id: 'model-llm',
      adapterType: 'paddlex',
    } as ModelEntity);
    extractorRepository.findOne.mockResolvedValue({ id: 'extractor-1' });

    await expect(
      service.create(user, { name: 'Test', textExtractorId: 'extractor-1', llmModelId: 'model-llm' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects missing model reference', async () => {
    modelRepository.findOne.mockResolvedValue(null);
    extractorRepository.findOne.mockResolvedValue({ id: 'extractor-1' });

    await expect(
      service.create(user, { name: 'Test', textExtractorId: 'extractor-1', llmModelId: 'missing-id' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates project when extractor and LLM are valid', async () => {
    modelRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where.id === 'llm-id') {
        return { id: 'llm-id', adapterType: 'openai' } as ModelEntity;
      }
      return null;
    });
    extractorRepository.findOne.mockResolvedValue({ id: 'extractor-1' });

    projectRepository.create.mockReturnValue({ id: 1 });
    projectRepository.save.mockResolvedValue({ id: 1, ownerId: 1 });

    const result = await service.create(user, {
      name: 'Test',
      textExtractorId: 'extractor-1',
      llmModelId: 'llm-id',
    });

    expect(projectRepository.save).toHaveBeenCalled();
    expect(result).toEqual({ id: 1, ownerId: 1 });
  });

  it('rejects invalid LLM model on update', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 1,
      ownerId: 1,
      name: 'Test',
      textExtractorId: 'extractor-1',
      llmModelId: 'llm-id',
      groups: [],
    } as unknown as ProjectEntity);

    modelRepository.findOne.mockResolvedValue({
      id: 'ocr-id',
      adapterType: 'paddlex',
    } as ModelEntity);
    extractorRepository.findOne.mockResolvedValue({ id: 'extractor-1' });

    await expect(
      service.update(user, 1, { llmModelId: 'ocr-id' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects missing LLM model on update', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 1,
      ownerId: 1,
      name: 'Test',
      textExtractorId: 'extractor-1',
      llmModelId: 'llm-id',
      groups: [],
    } as unknown as ProjectEntity);
    extractorRepository.findOne.mockResolvedValue({ id: 'extractor-1' });

    await expect(
      service.update(user, 1, { llmModelId: '' }),
    ).rejects.toThrow(BadRequestException);
  });
});
