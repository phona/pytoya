import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { JsonSchemaForm } from '@/shared/components/JsonSchemaForm';

describe('JsonSchemaForm', () => {
  it('renders inputs from schema properties', () => {
    const schema = {
      type: 'object',
      properties: {
        timeout: { type: 'number', title: 'Timeout', default: 30000 },
        name: { type: 'string', title: 'Name' },
      },
    };
    render(<JsonSchemaForm schema={schema} value={{}} onChange={() => {}} />);
    expect(screen.getByText('Timeout')).toBeTruthy();
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('calls onChange when number value changes', () => {
    const onChange = vi.fn();
    const schema = {
      type: 'object',
      properties: {
        timeout: { type: 'number', title: 'Timeout' },
      },
    };
    render(<JsonSchemaForm schema={schema} value={{}} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '5000' } });
    expect(onChange).toHaveBeenCalledWith({ timeout: 5000 });
  });

  it('calls onChange when string value changes', () => {
    const onChange = vi.fn();
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
      },
    };
    render(<JsonSchemaForm schema={schema} value={{}} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith({ name: 'hello' });
  });

  it('shows no configurable parameters for empty schema', () => {
    const schema = { type: 'object' };
    render(<JsonSchemaForm schema={schema} value={{}} onChange={() => {}} />);
    expect(screen.getByText('No configurable parameters')).toBeTruthy();
  });
});
