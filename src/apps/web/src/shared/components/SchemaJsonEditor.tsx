import { useEffect, useRef, useState } from 'react';
import type { SchemaValidationResult } from '@/api/schemas';

interface SchemaJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (schema: Record<string, unknown>) => Promise<SchemaValidationResult>;
  onError?: (error: string | null) => void;
  readOnly?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function SchemaJsonEditor({
  value,
  onChange,
  onValidate,
  onError,
  readOnly = false,
  placeholder = '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
  rows = 15,
  className = '',
}: SchemaJsonEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [lineCount, setLineCount] = useState<number>(1);
  const [validationResult, setValidationResult] = useState<SchemaValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const trimmed = value.trim();
      if (!trimmed) {
        setError(null);
        onError?.(null);
        return;
      }
      JSON.parse(value);
      setError(null);
      onError?.(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [value, onError]);

  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines);
  }, [value]);

  const handleScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const target = e.currentTarget;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
    } catch {
      // Ignore invalid JSON
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleValidate = async () => {
    if (!onValidate || error) {
      return;
    }
    setIsValidating(true);
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const result = await onValidate(parsed);
      setValidationResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      setValidationResult({
        valid: false,
        errors: [{ message }],
      });
    } finally {
      setIsValidating(false);
    }
  };

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className={`schema-json-editor ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={formatJSON}
            disabled={readOnly || !!error}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Format JSON"
          >
            Format
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Copy JSON"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={readOnly || !!error || !onValidate || isValidating}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Validate JSON Schema"
          >
            {isValidating ? 'Validating...' : 'Validate'}
          </button>
        </div>
        {error && (
          <span className="text-xs text-red-600 font-medium">
            Invalid JSON
          </span>
        )}
      </div>

      <div className="relative flex border rounded-md overflow-hidden">
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 w-10 bg-gray-50 border-r border-gray-300 text-gray-400 text-xs font-mono text-right pr-2 pt-2 select-none overflow-hidden"
          style={{ height: `${rows * 20}px` }}
        >
          {lineNumbers.map((lineNum) => (
            <div key={lineNum} className="leading-5">
              {lineNum}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          rows={rows}
          placeholder={placeholder}
          className={`flex-1 px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
            error ? 'bg-red-50' : 'bg-white'
          }`}
          style={{
            minHeight: `${rows * 20}px`,
            maxHeight: `${rows * 20}px`,
          }}
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-red-700 font-mono">{error}</p>
        </div>
      )}

      {validationResult && !error && (
        <div className={`mt-2 p-2 rounded border ${
          validationResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-xs font-medium ${
            validationResult.valid ? 'text-green-700' : 'text-red-700'
          }`}>
            {validationResult.valid ? 'Schema is valid' : 'Schema is invalid'}
          </p>
          {validationResult.errors && validationResult.errors.length > 0 && (
            <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
              {validationResult.errors.map((err, index) => (
                <li key={`${err.message}-${index}`}>
                  {err.message}
                  {err.line !== undefined && err.column !== undefined
                    ? ` (line ${err.line}, col ${err.column})`
                    : err.path
                      ? ` (${err.path})`
                      : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
