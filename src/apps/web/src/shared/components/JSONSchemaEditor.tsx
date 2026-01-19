'use client';

import { useState, useEffect, useRef } from 'react';

interface JSONSchemaEditorProps {
  value: string;
  onChange: (value: string) => void;
  onError?: (error: string | null) => void;
  readOnly?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function JSONSchemaEditor({
  value,
  onChange,
  onError,
  readOnly = false,
  placeholder = '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
  rows = 15,
  className = '',
}: JSONSchemaEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [lineCount, setLineCount] = useState<number>(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Validate JSON and update error state
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

  // Update line count
  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines);
  }, [value]);

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Handle tab key to insert spaces instead of changing focus
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const target = e.currentTarget;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        if (!target) {
          return;
        }
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Format/Prettify JSON
  const formatJSON = () => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
    } catch {
      // Don't change if invalid JSON
    }
  };

  // Minify JSON
  const minifyJSON = () => {
    try {
      const parsed = JSON.parse(value);
      const minified = JSON.stringify(parsed);
      onChange(minified);
    } catch {
      // Don't change if invalid JSON
    }
  };

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className={`json-schema-editor ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={formatJSON}
            disabled={readOnly || !!error}
            className="px-3 py-1 text-xs font-medium text-foreground bg-card border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            title="Format JSON (Prettify)"
          >
            Format
          </button>
          <button
            type="button"
            onClick={minifyJSON}
            disabled={readOnly || !!error}
            className="px-3 py-1 text-xs font-medium text-foreground bg-card border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            title="Minify JSON"
          >
            Minify
          </button>
        </div>
        {error && (
          <span className="text-xs text-destructive font-medium">
            Invalid JSON
          </span>
        )}
      </div>

      {/* Editor Container */}
      <div className="relative flex border rounded-md overflow-hidden">
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 w-10 bg-background border-r border-border text-muted-foreground text-xs font-mono text-right pr-2 pt-2 select-none overflow-hidden"
          style={{ height: `${rows * 20}px` }}
        >
          {lineNumbers.map((lineNum) => (
            <div key={lineNum} className="leading-5">
              {lineNum}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          rows={rows}
          placeholder={placeholder}
          className={`flex-1 px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring ${
            error ? 'bg-destructive/10' : 'bg-card'
          }`}
          style={{
            minHeight: `${rows * 20}px`,
            maxHeight: `${rows * 20}px`,
          }}
          spellCheck={false}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-1 p-2 bg-destructive/10 border border-destructive/30 rounded">
          <p className="text-xs text-destructive font-mono">{error}</p>
        </div>
      )}

      {/* Helper Text */}
      {!error && (
        <p className="mt-1 text-xs text-muted-foreground">
          Press Tab to indent. Use Format to prettify your JSON.
        </p>
      )}
    </div>
  );
}




