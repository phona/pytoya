import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SchemaJsonEditor } from './SchemaJsonEditor';

describe('SchemaJsonEditor', () => {
  it('validates schema when requested', async () => {
    const onValidate = vi.fn().mockResolvedValue({ valid: true });

    render(
      <SchemaJsonEditor
        value='{"type": "object", "properties": {}}'
        onChange={vi.fn()}
        onValidate={onValidate}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Validate/i }));

    await waitFor(() => {
      expect(onValidate).toHaveBeenCalledWith({ type: 'object', properties: {} });
    });

    expect(screen.getByText(/Schema is valid/i)).toBeInTheDocument();
  });

  it('shows invalid JSON state', async () => {
    render(
      <SchemaJsonEditor
        value='{ invalid json }'
        onChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Invalid JSON/i).length).toBeGreaterThan(0);
    });
  });

  it('formats JSON', async () => {
    const onChange = vi.fn();

    render(
      <SchemaJsonEditor
        value='{"type":"object"}'
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Format/i }));

    expect(onChange).toHaveBeenCalled();
    const formatted = onChange.mock.calls[0][0] as string;
    expect(formatted).toContain('\n');
  });

  it('copies JSON to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <SchemaJsonEditor
        value='{"type":"object"}'
        onChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Copy/i }));

    expect(writeText).toHaveBeenCalledWith('{"type":"object"}');
  });
});
