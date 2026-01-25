import { BadRequestException } from '@nestjs/common';

import { UpdateManifestUseCase } from './update-manifest.usecase';

describe('UpdateManifestUseCase (audit edit + gating)', () => {
  const user = { id: 1 } as any;

  it('blocks setting humanVerified=true when validation errors exist', async () => {
    const manifestsService = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        humanVerified: false,
        validationResults: { errorCount: 2 },
      }),
      update: jest.fn(),
    } as any;

    const useCase = new UpdateManifestUseCase(manifestsService);

    await expect(
      useCase.update(user, 1, { humanVerified: true } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resets humanVerified on extractedData edit unless explicitly set', async () => {
    const manifestsService = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        humanVerified: true,
        validationResults: { errorCount: 0 },
      }),
      update: jest.fn().mockResolvedValue({ id: 1, humanVerified: false }),
    } as any;

    const useCase = new UpdateManifestUseCase(manifestsService);

    await useCase.update(user, 1, { extractedData: { a: 1 } } as any);

    expect(manifestsService.update).toHaveBeenCalledWith(
      user,
      1,
      expect.objectContaining({ humanVerified: false }),
    );
  });
});

