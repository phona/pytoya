import { useState } from 'react';
import { Eye, EyeOff, Copy } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

type SecureApiKeyInputProps = {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
};

const MASKED_SECRET = '********';

export function SecureApiKeyInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  helperText,
}: SecureApiKeyInputProps) {
  const [visible, setVisible] = useState(false);
  const isMasked = value === MASKED_SECRET;
  const canCopy = Boolean(value) && !isMasked;

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="pr-20"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setVisible((prev) => !prev)}
            aria-label={visible ? 'Hide secret' : 'Show secret'}
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
            disabled={!canCopy}
            aria-label="Copy secret"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {(helperText || isMasked) && (
        <p className="text-xs text-muted-foreground">
          {helperText}
          {helperText && isMasked ? ' ' : ''}
          {isMasked ? 'Saved. Use “Test Connection” to verify.' : ''}
        </p>
      )}
    </div>
  );
}
