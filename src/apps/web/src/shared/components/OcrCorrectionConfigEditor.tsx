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
        <span className="block text-xs font-medium text-muted-foreground">OCR Corrections</span>
        <button
          type="button"
          onClick={addMapping}
          className="text-xs text-primary hover:text-primary"
        >
          Add mapping
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {mappings.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No mappings defined.</p>
        )}
        {mappings.map((mapping, index) => (
          <div key={`${mapping.from}-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={mapping.from}
              onChange={(event) => updateMapping(index, 'from', event.target.value)}
              className="w-24 rounded-md border border-border px-2 py-1 text-xs focus:border-ring focus:outline-none focus:ring-ring"
              placeholder="From"
              aria-label={`OCR correction from ${index + 1}`}
            />
            <span className="text-xs text-muted-foreground">→</span>
            <input
              type="text"
              value={mapping.to}
              onChange={(event) => updateMapping(index, 'to', event.target.value)}
              className="w-24 rounded-md border border-border px-2 py-1 text-xs focus:border-ring focus:outline-none focus:ring-ring"
              placeholder="To"
              aria-label={`OCR correction to ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => removeMapping(index)}
              className="text-xs text-destructive hover:text-destructive"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}




