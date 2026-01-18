type OcrMapping = {
  from: string;
  to: string;
};

interface OcrCorrectionConfigEditorProps {
  mappings: OcrMapping[];
  onChange: (mappings: OcrMapping[]) => void;
}

export function OcrCorrectionConfigEditor({
  mappings,
  onChange,
}: OcrCorrectionConfigEditorProps) {
  const updateMapping = (index: number, key: keyof OcrMapping, value: string) => {
    const next = mappings.map((mapping, idx) =>
      idx === index ? { ...mapping, [key]: value } : mapping,
    );
    onChange(next);
  };

  const addMapping = () => {
    onChange([...mappings, { from: '', to: '' }]);
  };

  const removeMapping = (index: number) => {
    onChange(mappings.filter((_, idx) => idx !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="block text-xs font-medium text-gray-600">OCR Corrections</span>
        <button
          type="button"
          onClick={addMapping}
          className="text-xs text-indigo-600 hover:text-indigo-700"
        >
          Add mapping
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {mappings.length === 0 && (
          <p className="text-[11px] text-gray-500">No mappings defined.</p>
        )}
        {mappings.map((mapping, index) => (
          <div key={`${mapping.from}-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={mapping.from}
              onChange={(event) => updateMapping(index, 'from', event.target.value)}
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="From"
              aria-label={`OCR correction from ${index + 1}`}
            />
            <span className="text-xs text-gray-500">→</span>
            <input
              type="text"
              value={mapping.to}
              onChange={(event) => updateMapping(index, 'to', event.target.value)}
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="To"
              aria-label={`OCR correction to ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => removeMapping(index)}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
