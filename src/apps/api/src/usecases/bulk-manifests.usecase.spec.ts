import { BulkManifestsUseCase } from './bulk-manifests.usecase';

describe('BulkManifestsUseCase (workflow without DB)', () => {
  const user = { id: 1 } as any;

  it('delegates deleteBulk to ManifestsService.removeMany', async () => {
    const manifestsService = {
      removeMany: jest.fn().mockResolvedValue({ ok: true }),
    } as any;

    const csvExportService = {} as any;

    const useCase = new BulkManifestsUseCase(manifestsService, csvExportService);

    await useCase.deleteBulk(user, 2, [10, 11]);
    expect(manifestsService.removeMany).toHaveBeenCalledWith(user, 2, [10, 11]);
  });

  it('delegates exportBulk to CsvExportService.exportCsvByManifestIds', async () => {
    const manifestsService = {} as any;
    const csvExportService = {
      exportCsvByManifestIds: jest.fn().mockResolvedValue({ filename: 'x.csv', csv: 'a,b' }),
    } as any;

    const useCase = new BulkManifestsUseCase(manifestsService, csvExportService);

    await useCase.exportBulk(user, [10, '11']);
    expect(csvExportService.exportCsvByManifestIds).toHaveBeenCalledWith(user, ['10', '11']);
  });
});

