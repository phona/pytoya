import { http, HttpResponse } from 'msw';

type ExtractionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled';

type ExtractionScenarioStep = {
  status: ExtractionStatus;
  error?: string | null;
};

export const createExtractionHistoryScenario = (options: {
  manifestId: number;
  jobId: number;
  queueJobId?: string | null;
  steps: ExtractionScenarioStep[];
}) => {
  const queueJobId = options.queueJobId ?? `q-${options.jobId}`;

  let callIndex = 0;
  const nextStep = () => {
    const step = options.steps[Math.min(callIndex, options.steps.length - 1)];
    callIndex += 1;
    return step;
  };

  const buildEntry = (step: ExtractionScenarioStep) => ({
    jobId: options.jobId,
    queueJobId,
    status: step.status,
    llmModelId: 'model-1',
    llmModelName: 'Test Model',
    promptId: 1,
    promptName: 'Prompt',
    fieldName: null,
    estimatedCost: null,
    actualCost: null,
    textEstimatedCost: null,
    textActualCost: null,
    llmEstimatedCost: null,
    llmActualCost: null,
    currency: 'USD',
    llmInputTokens: null,
    llmOutputTokens: null,
    pagesProcessed: null,
    attemptCount: 1,
    error: step.error ?? null,
    cancelReason: null,
    cancelRequestedAt: null,
    canceledAt: null,
    createdAt: '2026-01-13T00:00:00.000Z',
    startedAt: step.status === 'pending' ? null : '2026-01-13T00:00:01.000Z',
    completedAt:
      step.status === 'completed' || step.status === 'failed' || step.status === 'canceled'
        ? '2026-01-13T00:00:03.000Z'
        : null,
    durationMs:
      step.status === 'completed' || step.status === 'failed' || step.status === 'canceled' ? 2000 : null,
  });

  return [
    http.get(`/api/manifests/${options.manifestId}/extraction-history`, () => {
      const step = nextStep();
      return HttpResponse.json([buildEntry(step)]);
    }),
    http.get(`/api/manifests/${options.manifestId}/extraction-history/${options.jobId}`, () => {
      const step = nextStep();
      return HttpResponse.json({
        ...buildEntry(step),
        systemPrompt: null,
        userPrompt: null,
        assistantResponse: null,
        promptTemplateContent: null,
      });
    }),
  ];
};

