import { useCallback, useEffect, useState } from 'react';
import { Manifest, ManifestItem } from '@/api/manifests';

interface EditableFormProps {
  manifest: Manifest;
  items: ManifestItem[];
  onSave: (data: Partial<Manifest>) => void;
  onReExtractField: (fieldName: string) => void;
}

export function EditableForm({ manifest, items, onSave, onReExtractField }: EditableFormProps) {
  const extractedData = (manifest.extractedData ?? {}) as ExtractedData;

  const [formData, setFormData] = useState({
    department: extractedData.department?.code || '',
    invoice: {
      po_no: extractedData.invoice?.po_no || '',
      invoice_date: extractedData.invoice?.invoice_date || '',
      usage: extractedData.invoice?.usage || '',
    },
    human_checked: manifest.humanVerified || false,
    items: items || [],
  });

  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const handleSave = useCallback(() => {
    const updatedData = {
      ...manifest.extractedData,
      department: { code: formData.department },
      invoice: formData.invoice,
      items: formData.items,
    };

    onSave({
      extractedData: updatedData,
      humanVerified: formData.human_checked,
    });

    setUnsavedChanges(false);
  }, [formData, manifest.extractedData, onSave]);

  useEffect(() => {
    if (!unsavedChanges) {
      return;
    }
    const timer = setTimeout(() => {
      handleSave();
    }, 1000);
    return () => clearTimeout(timer);
  }, [handleSave, unsavedChanges]);

  const handleFieldChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [keys[0]]: value } as typeof prev;
      } else if (keys.length === 2) {
        if (keys[0] === 'invoice') {
          return {
            ...prev,
            invoice: { ...prev.invoice, [keys[1]]: value },
          };
        }
        return prev;
      }
      return prev;
    });
    setUnsavedChanges(true);
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: newItems }));
    setUnsavedChanges(true);
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now(),
          description: '',
          quantity: 0,
          unitPrice: 0,
          totalPrice: 0,
          manifestId: manifest.id,
        },
      ],
    }));
    setUnsavedChanges(true);
  };

  const handleDeleteItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    setUnsavedChanges(true);
  };

  const getConfidenceColor = (fieldName: string) => {
    // Get confidence from _extraction_info if available
    const extractionInfo = extractedData._extraction_info ?? {};
    const fieldConfidence = extractionInfo.field_confidences?.[fieldName];
    if (!fieldConfidence) return 'border-gray-300';

    if (fieldConfidence >= 0.9) return 'border-green-500';
    if (fieldConfidence >= 0.7) return 'border-yellow-500';
    return 'border-red-500';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Extraction Info */}
      {extractedData._extraction_info && (
        <ExtractionAlert extractionInfo={extractedData._extraction_info} />
      )}

      {/* Department */}
      <FormField
        inputId="departmentCode"
        label="Department Code"
        value={formData.department}
        onChange={(value) => handleFieldChange('department', value)}
        onReExtract={() => onReExtractField('department')}
        confidenceColor={getConfidenceColor('department')}
      />

      {/* Invoice Fields */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Invoice Information</h3>

        <FormField
          inputId="invoicePoNumber"
          label="PO Number"
          value={formData.invoice.po_no}
          onChange={(value) => handleFieldChange('invoice.po_no', value)}
          onReExtract={() => onReExtractField('invoice.po_no')}
          confidenceColor={getConfidenceColor('invoice.po_no')}
        />

        <FormField
          inputId="invoiceDate"
          label="Invoice Date"
          type="date"
          value={formData.invoice.invoice_date}
          onChange={(value) => handleFieldChange('invoice.invoice_date', value)}
          onReExtract={() => onReExtractField('invoice.invoice_date')}
          confidenceColor={getConfidenceColor('invoice.invoice_date')}
        />

        <FormField
          inputId="invoiceUsage"
          label="Usage"
          value={formData.invoice.usage}
          onChange={(value) => handleFieldChange('invoice.usage', value)}
          onReExtract={() => onReExtractField('invoice.usage')}
          confidenceColor={getConfidenceColor('invoice.usage')}
        />
      </div>

      {/* Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-900">Line Items</h3>
          <button
            onClick={handleAddItem}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            + Add Item
          </button>
        </div>

        {formData.items.map((item, index) => (
          <ItemCard
            key={item.id}
            item={item}
            onChange={(field, value) => handleItemChange(index, field, value)}
            onDelete={() => handleDeleteItem(index)}
          />
        ))}

        {formData.items.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No items. Click &quot;Add Item&quot; to create one.
          </div>
        )}
      </div>

      {/* Human Verified */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="human_verified"
          checked={formData.human_checked}
          onChange={(e) => {
            handleFieldChange('human_checked', e.target.checked);
          }}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="human_verified" className="ml-2 text-sm text-gray-700">
          Human Verified
        </label>
      </div>

      {/* Unsaved Changes Indicator */}
      {unsavedChanges && (
        <div className="text-xs text-gray-500 italic">Auto-saving...</div>
      )}
    </div>
  );
}

interface FormFieldProps {
  inputId: string;
  label: string;
  value: string | number;
  type?: 'text' | 'number' | 'date';
  onChange: (value: string) => void;
  onReExtract: () => void;
  confidenceColor: string;
}

function FormField({
  inputId,
  label,
  value,
  type = 'text',
  onChange,
  onReExtract,
  confidenceColor,
}: FormFieldProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <button
          onClick={onReExtract}
          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          title="Re-extract this field"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Re-extract
        </button>
      </div>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border-l-4 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${confidenceColor}`}
      />
    </div>
  );
}

interface ItemCardProps {
  item: ManifestItem;
  onChange: (field: string, value: string | number) => void;
  onDelete: () => void;
}

function ItemCard({ item, onChange, onDelete }: ItemCardProps) {
  const descriptionId = `item-${item.id}-description`;
  const quantityId = `item-${item.id}-quantity`;
  const unitPriceId = `item-${item.id}-unit-price`;
  const totalId = `item-${item.id}-total`;

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex justify-end">
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 text-sm"
          title="Delete item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div>
        <label htmlFor={descriptionId} className="block text-xs font-medium text-gray-500 mb-1">
          Description
        </label>
        <input
          id={descriptionId}
          type="text"
          value={item.description}
          onChange={(e) => onChange('description', e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label htmlFor={quantityId} className="block text-xs font-medium text-gray-500 mb-1">
            Quantity
          </label>
          <input
            id={quantityId}
            type="number"
            step="0.01"
            value={item.quantity}
            onChange={(e) => onChange('quantity', parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label htmlFor={unitPriceId} className="block text-xs font-medium text-gray-500 mb-1">
            Unit Price
          </label>
          <input
            id={unitPriceId}
            type="number"
            step="0.01"
            value={item.unitPrice}
            onChange={(e) => onChange('unitPrice', parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label htmlFor={totalId} className="block text-xs font-medium text-gray-500 mb-1">
            Total
          </label>
          <input
            id={totalId}
            type="number"
            step="0.01"
            value={item.totalPrice}
            onChange={(e) => onChange('totalPrice', parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

interface ExtractionAlertProps {
  extractionInfo: {
    confidence?: number;
    ocr_issues?: string[];
    uncertain_fields?: string[];
  };
}

interface ExtractedData {
  department?: { code?: string };
  invoice?: { po_no?: string; invoice_date?: string; usage?: string };
  items?: ManifestItem[];
  _extraction_info?: {
    field_confidences?: Record<string, number>;
    confidence?: number;
    ocr_issues?: string[];
    uncertain_fields?: string[];
  };
}

function ExtractionAlert({ extractionInfo }: ExtractionAlertProps) {
  const issues = extractionInfo.ocr_issues || [];
  const uncertainFields = extractionInfo.uncertain_fields || [];

  if (issues.length === 0 && uncertainFields.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start">
        <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-yellow-800">Extraction Issues</h4>
          <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
            {uncertainFields.map((field, i) => (
              <li key={`uncertain-${i}`}>Uncertain field: {field}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
