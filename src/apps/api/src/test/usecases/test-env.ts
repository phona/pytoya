import { ExtractManifestsUseCase } from '../../usecases/extract-manifests.usecase';
import { InMemoryJobQueue } from './in-memory-job-queue';

export const makeExtractUseCaseTestEnv = (options?: {
  manifestsService?: any;
  groupsService?: any;
}) => {
  const manifestsService = options?.manifestsService ?? {};
  const groupsService = options?.groupsService ?? {};
  const jobQueue = new InMemoryJobQueue();
  const useCase = new ExtractManifestsUseCase(
    manifestsService,
    groupsService,
    jobQueue,
  );

  return { jobQueue, manifestsService, groupsService, useCase };
};

