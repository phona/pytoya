import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '@/tests/utils';
import { GuidedSetupWizard } from './GuidedSetupWizard';

vi.mock('@/shared/hooks/use-extractors', () => ({
  useExtractors: () => ({
    extractors: [],
  }),
}));

vi.mock('@/shared/hooks/use-models', () => ({
  useModels: () => ({
    models: [],
  }),
}));

describe('GuidedSetupWizard', () => {
  beforeEach(() => {
    localStorage.setItem('pytoya-locale', 'zh-CN');
  });

  it('renders translated wizard title', async () => {
    renderWithProviders(
      <GuidedSetupWizard isOpen={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    expect(await screen.findByText('引导式项目创建')).toBeInTheDocument();
  });
});
