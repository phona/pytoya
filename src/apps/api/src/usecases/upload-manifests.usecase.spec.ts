import { FileNotFoundException } from '../storage/exceptions/file-not-found.exception';
import { UploadManifestsUseCase } from './upload-manifests.usecase';

describe('UploadManifestsUseCase', () => {
  const user = { id: 1 } as any;

  it('delegates uploadSingle to ManifestsService.create', async () => {
    const manifestsService = {
      create: jest.fn().mockResolvedValue({ manifest: { id: 1 }, isDuplicate: false }),
    } as any;

    const useCase = new UploadManifestsUseCase(manifestsService);
    const file = { originalname: 'a.pdf' } as any;

    await useCase.uploadSingle(user, 10, file);

    expect(manifestsService.create).toHaveBeenCalledWith(user, 10, file);
  });

  it('throws when uploadBatch has no files', async () => {
    const manifestsService = {
      create: jest.fn(),
    } as any;

    const useCase = new UploadManifestsUseCase(manifestsService);

    await expect(useCase.uploadBatch(user, 10, undefined)).rejects.toBeInstanceOf(
      FileNotFoundException,
    );
    await expect(useCase.uploadBatch(user, 10, [])).rejects.toBeInstanceOf(
      FileNotFoundException,
    );
  });

  it('delegates uploadBatch to ManifestsService.create for each file', async () => {
    const manifestsService = {
      create: jest
        .fn()
        .mockResolvedValueOnce({ manifest: { id: 1 }, isDuplicate: false })
        .mockResolvedValueOnce({ manifest: { id: 2 }, isDuplicate: true }),
    } as any;

    const useCase = new UploadManifestsUseCase(manifestsService);

    const files = [{ originalname: 'a.pdf' }, { originalname: 'b.pdf' }] as any[];
    const results = await useCase.uploadBatch(user, 10, files);

    expect(manifestsService.create).toHaveBeenCalledTimes(2);
    expect(manifestsService.create).toHaveBeenNthCalledWith(1, user, 10, files[0]);
    expect(manifestsService.create).toHaveBeenNthCalledWith(2, user, 10, files[1]);
    expect(results).toEqual([
      { manifest: { id: 1 }, isDuplicate: false },
      { manifest: { id: 2 }, isDuplicate: true },
    ]);
  });
});
