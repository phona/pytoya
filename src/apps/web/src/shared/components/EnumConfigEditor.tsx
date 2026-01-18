import { useId } from 'react';

interface EnumConfigEditorProps {
  values: string[];
  onChange: (values: string[]) => void;
}

export function EnumConfigEditor({ values, onChange }: EnumConfigEditorProps) {
  const valueText = values.join(', ');
  const inputId = useId();

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium text-gray-600">Allowed Values</label>
      <input
        id={inputId}
        type="text"
        value={valueText}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean),
          )
        }
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        placeholder="KG, EA, M"
      />
      <p className="mt-1 text-[11px] text-gray-500">Separate values with commas.</p>
    </div>
  );
}
