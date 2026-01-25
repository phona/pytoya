import { BadRequestException } from '@nestjs/common';

import { makeExtractUseCaseTestEnv } from '../test/usecases/test-env';

describe('ExtractManifestsUseCase (workflow without BullMQ/Redis)', () => {
  const mockUser = { id: 1, role: 'user' } as any;

  it('enqueues extraction with llmModelId fallback from manifest group project', async () => {
    const manifestsService = {
      findOne: jest.fn().mockResolvedValue({
        id: 123,
        group: { project: { llmModelId: 'model-from-project' } },
      }),
    } as any;

    const { useCase, jobQueue } = makeExtractUseCaseTestEnv({ manifestsService });

    const result = await useCase.extractSingle(mockUser, 123, {
      promptId: 9,
    } as any);

    expect(result.jobId).toBe('job_1');
    expect(jobQueue.getEnqueued()).toEqual([
      {
        kind: 'extraction',
        request: {
          manifestId: 123,
          llmModelId: 'model-from-project',
          promptId: 9,
        },
      },
    ]);
  });

  it('extractBulk enqueues one job per manifest and returns batch summary', async () => {
    const manifestsService = {
      findManyByIds: jest.fn().mockResolvedValue([
        { id: 10, group: { project: { llmModelId: 'model-from-project' } } },
        { id: 11, group: { project: { llmModelId: 'model-from-project' } } },
      ]),
    } as any;

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(123);
    const { useCase, jobQueue } = makeExtractUseCaseTestEnv({ manifestsService });

    const result = await useCase.extractBulk(mockUser, {
      manifestIds: [10, 11],
    } as any);

    expect(result.jobId).toBe('batch_123_2');
    expect(result.manifestCount).toBe(2);
    expect(result.jobIds).toEqual(['job_1', 'job_2']);
    expect(result.jobs).toEqual([
      { jobId: 'job_1', manifestId: 10 },
      { jobId: 'job_2', manifestId: 11 },
    ]);

    expect(jobQueue.getEnqueued()).toEqual([
      {
        kind: 'extraction',
        request: { manifestId: 10, llmModelId: 'model-from-project', promptId: undefined },
      },
      {
        kind: 'extraction',
        request: { manifestId: 11, llmModelId: 'model-from-project', promptId: undefined },
      },
    ]);

    nowSpy.mockRestore();
  });

  it('extractFiltered enqueues jobs, sets textExtractorId, and resolves llmModelId from group project', async () => {
    const groupsService = {
      findOne: jest.fn().mockResolvedValue({ id: 1, project: { llmModelId: 'model-from-project' } }),
    } as any;

    const manifestsService = {
      findForFilteredExtraction: jest.fn().mockResolvedValue([
        { id: 21 },
        { id: 22 },
      ]),
      setTextExtractorForManifests: jest.fn().mockResolvedValue(undefined),
    } as any;

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(456);
    const { useCase, jobQueue } = makeExtractUseCaseTestEnv({ manifestsService, groupsService });

    const result = await useCase.extractFiltered(mockUser, 1, {
      filters: { status: 'pending' },
      textExtractorId: 'ocr-x',
    } as any);

    expect(result.jobId).toBe('batch_456_2');
    expect(result.jobIds).toEqual(['job_1', 'job_2']);
    expect(result.jobs).toEqual([
      { jobId: 'job_1', manifestId: 21 },
      { jobId: 'job_2', manifestId: 22 },
    ]);

    expect(manifestsService.setTextExtractorForManifests).toHaveBeenCalledWith(
      mockUser,
      1,
      [21, 22],
      'ocr-x',
    );

    expect(jobQueue.getEnqueued()).toEqual([
      { kind: 'extraction', request: { manifestId: 21, llmModelId: 'model-from-project', promptId: undefined } },
      { kind: 'extraction', request: { manifestId: 22, llmModelId: 'model-from-project', promptId: undefined } },
    ]);

    nowSpy.mockRestore();
  });

  it('reExtractField previewOnly returns preview and does not enqueue', async () => {
    const manifestsService = {
      findOne: jest.fn().mockResolvedValue({
        id: 123,
        ocrResult: { ok: true },
      }),
      buildOcrContextPreview: jest.fn().mockReturnValue({ snippet: 'ctx' }),
    } as any;

    const { useCase, jobQueue } = makeExtractUseCaseTestEnv({ manifestsService });

    const result = await useCase.reExtractField(mockUser, 123, {
      fieldName: 'invoice.po_no',
      previewOnly: true,
    } as any);

    expect(result.fieldName).toBe('invoice.po_no');
    expect(result.jobId).toBeUndefined();
    expect(jobQueue.getEnqueued()).toEqual([]);
  });

  it('reExtractField enqueues extraction with OCR snippet when previewOnly is false', async () => {
    const manifestsService = {
      findOne: jest.fn().mockResolvedValue({
        id: 123,
        ocrResult: { ok: true },
      }),
      buildOcrContextPreview: jest.fn().mockReturnValue({ snippet: 'ctx' }),
    } as any;

    const { useCase, jobQueue } = makeExtractUseCaseTestEnv({ manifestsService });

    const result = await useCase.reExtractField(mockUser, 123, {
      fieldName: 'invoice.po_no',
      previewOnly: false,
      llmModelId: 'model-x',
      promptId: 2,
    } as any);

    expect(result.jobId).toBe('job_1');
    expect(jobQueue.getEnqueued()[0]).toMatchObject({
      kind: 'extraction',
      request: {
        manifestId: 123,
        fieldName: 'invoice.po_no',
        llmModelId: 'model-x',
        promptId: 2,
        textContextSnippet: 'ctx',
      },
    });
  });

  it('reExtractField throws when OCR is missing', async () => {
    const manifestsService = {
      findOne: jest.fn().mockResolvedValue({ id: 123, ocrResult: null }),
      buildOcrContextPreview: jest.fn(),
    } as any;

    const { useCase } = makeExtractUseCaseTestEnv({ manifestsService });

    await expect(
      useCase.reExtractField(mockUser, 123, {
        fieldName: 'invoice.po_no',
        previewOnly: false,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
