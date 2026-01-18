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
    service = new ProjectsService(
      projectRepository as any,
      modelRepository as any,
    );
  });

  it('rejects OCR model with LLM adapter', async () => {
    modelRepository.findOne.mockResolvedValue({
      id: 'model-llm',
      adapterType: 'openai',
    } as ModelEntity);

    await expect(
      service.create(user, { name: 'Test', ocrModelId: 'model-llm', llmModelId: 'model-llm' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects missing model reference', async () => {
    modelRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(user, { name: 'Test', llmModelId: 'missing-id' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates project when model categories are valid', async () => {
    modelRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where.id === 'ocr-id') {
        return { id: 'ocr-id', adapterType: 'paddlex' } as ModelEntity;
      }
      if (where.id === 'llm-id') {
        return { id: 'llm-id', adapterType: 'openai' } as ModelEntity;
      }
      return null;
    });

    projectRepository.create.mockReturnValue({ id: 1 });
    projectRepository.save.mockResolvedValue({ id: 1, ownerId: 1 });

    const result = await service.create(user, {
      name: 'Test',
      ocrModelId: 'ocr-id',
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
      groups: [],
    } as unknown as ProjectEntity);

    modelRepository.findOne.mockResolvedValue({
      id: 'ocr-id',
      adapterType: 'paddlex',
    } as ModelEntity);

    await expect(
      service.update(user, 1, { llmModelId: 'ocr-id' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects missing LLM model on update', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 1,
      ownerId: 1,
      name: 'Test',
      groups: [],
    } as unknown as ProjectEntity);

    await expect(
      service.update(user, 1, { llmModelId: '' }),
    ).rejects.toThrow(BadRequestException);
  });
});
