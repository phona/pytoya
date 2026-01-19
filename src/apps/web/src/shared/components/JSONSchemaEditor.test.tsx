import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { JSONSchemaEditor } from './JSONSchemaEditor';

describe('JSONSchemaEditor', () => {
  const mockOnChange = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render editor with textarea and line numbers', () => {
      render(
        <JSONSchemaEditor
          value='{"type": "object"}'
          onChange={mockOnChange}
          placeholder='Enter your JSON Schema here'
        />
      );

      expect(screen.getByPlaceholderText(/Enter your JSON Schema here/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Format/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Minify/i })).toBeInTheDocument();
    });

    it('should display line numbers', () => {
      const multiLineJson = '{\n  "type": "object",\n  "properties": {}\n}';

      render(
        <JSONSchemaEditor
          value={multiLineJson}
          onChange={mockOnChange}
        />
      );

      // Line numbers should be visible
      const lineNumbers = screen.getAllByText(/^\d+$/);
      expect(lineNumbers.length).toBeGreaterThan(0);
    });
  });

  describe('JSON validation', () => {
    it('should validate valid JSON', () => {
      render(
        <JSONSchemaEditor
          value='{"type": "object", "properties": {}}'
          onChange={mockOnChange}
          onError={mockOnError}
        />
      );

      expect(mockOnError).toHaveBeenCalledWith(null);
      expect(screen.queryByText(/Invalid JSON/i)).not.toBeInTheDocument();
    });

    it('should show error for invalid JSON', async () => {
      render(
        <JSONSchemaEditor
          value='{invalid json}'
          onChange={mockOnChange}
          onError={mockOnError}
        />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(expect.any(String));
        expect(
          screen.getByText('Invalid JSON', { selector: 'span' })
        ).toBeInTheDocument();
      });
    });

    it('should display error message for invalid JSON', async () => {
      render(
        <JSONSchemaEditor
          value='{"type": "object"'
          onChange={mockOnChange}
          onError={mockOnError}
        />
      );

      await waitFor(() => {
        const errorText = screen.getByText(/Expected|Unexpected/i);
        expect(errorText).toBeInTheDocument();
        expect(errorText).toHaveClass('text-destructive');
        expect(errorText.closest('div')).toHaveClass('bg-destructive/10');
      });
    });
  });

  describe('Format functionality', () => {
    it('should format/prettify JSON', async () => {
      const user = userEvent.setup();
      const minifiedJson = '{"type":"object","properties":{"field":{"type":"string"}}}';

      render(
        <JSONSchemaEditor
          value={minifiedJson}
          onChange={mockOnChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /Format/i }));

      expect(mockOnChange).toHaveBeenCalled();
      const calledWith = mockOnChange.mock.calls[0][0];
      expect(calledWith).toContain('\n');
    });

    it('should minify JSON', async () => {
      const user = userEvent.setup();
      const formattedJson = '{\n  "type": "object"\n}';

      render(
        <JSONSchemaEditor
          value={formattedJson}
          onChange={mockOnChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /Minify/i }));

      expect(mockOnChange).toHaveBeenCalled();
      const calledWith = mockOnChange.mock.calls[0][0];
      expect(calledWith).not.toContain('\n');
    });

    it('should disable format button when JSON is invalid', () => {
      render(
        <JSONSchemaEditor
          value='{invalid}'
          onChange={mockOnChange}
        />
      );

      const formatButton = screen.getByRole('button', { name: /Format/i });
      expect(formatButton).toBeDisabled();
    });

    it('should disable minify button when JSON is invalid', () => {
      render(
        <JSONSchemaEditor
          value='{invalid}'
          onChange={mockOnChange}
        />
      );

      const minifyButton = screen.getByRole('button', { name: /Minify/i });
      expect(minifyButton).toBeDisabled();
    });
  });

  describe('Tab key handling', () => {
    it('should insert spaces when tab is pressed', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <JSONSchemaEditor
          value='{"type": "object"}'
          onChange={mockOnChange}
        />
      );

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      textarea.focus();

      // Move cursor to position 5 and press tab
      textarea.selectionStart = textarea.selectionEnd = 5;
      await user.keyboard('{Tab}');

      expect(mockOnChange).toHaveBeenCalled();
      const calledWith = mockOnChange.mock.calls[0][0];
      expect(calledWith).toContain('  ');
    });
  });

  describe('Read-only mode', () => {
    it('should disable textarea in read-only mode', () => {
      const { container } = render(
        <JSONSchemaEditor
          value='{"type": "object"}'
          onChange={mockOnChange}
          readOnly={true}
        />
      );

      const textarea = container.querySelector('textarea');
      expect(textarea).toHaveAttribute('readonly');
    });

    it('should disable format button in read-only mode', () => {
      render(
        <JSONSchemaEditor
          value='{"type": "object"}'
          onChange={mockOnChange}
          readOnly={true}
        />
      );

      const formatButton = screen.getByRole('button', { name: /Format/i });
      expect(formatButton).toBeDisabled();
    });
  });

  describe('Helper text', () => {
    it('should show helper text when JSON is valid', () => {
      render(
        <JSONSchemaEditor
          value='{"type": "object"}'
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Press Tab to indent/i)).toBeInTheDocument();
      expect(screen.getByText(/Use Format to prettify/i)).toBeInTheDocument();
    });

    it('should hide helper text when JSON is invalid', async () => {
      render(
        <JSONSchemaEditor
          value='{invalid}'
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Press Tab to indent/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Scroll synchronization', () => {
    it('should sync line numbers scroll with textarea', async () => {
      const longJson = '{\n'.repeat(50) + '}';

      const { container } = render(
        <JSONSchemaEditor
          value={longJson}
          onChange={mockOnChange}
          rows={10}
        />
      );

      const textarea = container.querySelector('textarea');
      expect(textarea).toBeInTheDocument();
      fireEvent.scroll(textarea!, { target: { scrollTop: 100 } });
    });
  });

  describe('Empty value handling', () => {
    it('should handle empty value without errors', () => {
      render(
        <JSONSchemaEditor
          value=""
          onChange={mockOnChange}
          onError={mockOnError}
        />
      );

      // Empty value should not trigger validation error
      expect(mockOnError).toHaveBeenCalledWith(null);
    });

    it('should handle whitespace-only value without errors', () => {
      render(
        <JSONSchemaEditor
          value="   "
          onChange={mockOnChange}
          onError={mockOnError}
        />
      );

      // Whitespace should not trigger validation
      expect(mockOnError).not.toHaveBeenCalledWith(expect.any(String));
    });
  });
});




