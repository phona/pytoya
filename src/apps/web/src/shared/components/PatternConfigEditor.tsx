import { useId } from 'react';

interface PatternConfigEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PatternConfigEditor({ value, onChange }: PatternConfigEditorProps) {
  const inputId = useId();

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium text-gray-600">Regex Pattern</label>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        placeholder="^\\d{7}$"
      />
    </div>
  );
}
