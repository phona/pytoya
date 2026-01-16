import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ModelCard } from './ModelCard';

describe('ModelCard', () => {
  const model = {
    id: 'model-1',
    name: 'OpenAI GPT-4o',
    adapterType: 'openai',
    description: 'Production model',
    category: 'llm',
    parameters: { baseUrl: 'https://api.openai.com', apiKey: '********' },
    isActive: true,
    createdAt: '2025-01-13T00:00:00.000Z',
    updatedAt: '2025-01-13T00:00:00.000Z',
  };

  it('renders model details', () => {
    render(<ModelCard model={model} />);
    expect(screen.getByText('OpenAI GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('llm')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('invokes callbacks', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onTest = vi.fn();
    const user = userEvent.setup();

    render(
      <ModelCard
        model={model}
        onEdit={onEdit}
        onDelete={onDelete}
        onTest={onTest}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Edit/i }));
    await user.click(screen.getByRole('button', { name: /Delete/i }));
    await user.click(screen.getByRole('button', { name: /Test/i }));

    expect(onEdit).toHaveBeenCalledWith(model);
    expect(onDelete).toHaveBeenCalledWith('model-1');
    expect(onTest).toHaveBeenCalledWith('model-1');
  });
});
