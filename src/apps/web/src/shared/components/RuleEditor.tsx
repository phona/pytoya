import { useId } from 'react';
import { SchemaRuleOperator, SchemaRuleType } from '@/api/schemas';
import { EnumConfigEditor } from '@/shared/components/EnumConfigEditor';
import { OcrCorrectionConfigEditor } from '@/shared/components/OcrCorrectionConfigEditor';
import { PatternConfigEditor } from '@/shared/components/PatternConfigEditor';

export type RuleDraft = {
  id?: number;
  fieldPath: string;
  ruleType: SchemaRuleType;
  ruleOperator: SchemaRuleOperator;
  ruleConfig: Record<string, unknown>;
  errorMessage?: string;
  priority?: number;
  enabled?: boolean;
  description?: string;
};

interface RuleEditorProps {
  rules: RuleDraft[];
  onChange: (rules: RuleDraft[]) => void;
}

const RULE_TYPE_OPTIONS = [
  { value: SchemaRuleType.VERIFICATION, label: 'Verification' },
  { value: SchemaRuleType.RESTRICTION, label: 'Restriction' },
];

const RULE_OPERATOR_OPTIONS = [
  { value: SchemaRuleOperator.PATTERN, label: 'Pattern' },
  { value: SchemaRuleOperator.ENUM, label: 'Enum' },
  { value: SchemaRuleOperator.RANGE_MIN, label: 'Range Min' },
  { value: SchemaRuleOperator.RANGE_MAX, label: 'Range Max' },
  { value: SchemaRuleOperator.LENGTH_MIN, label: 'Length Min' },
  { value: SchemaRuleOperator.LENGTH_MAX, label: 'Length Max' },
  { value: SchemaRuleOperator.OCR_CORRECTION, label: 'OCR Correction' },
];

const createEmptyRule = (): RuleDraft => ({
  fieldPath: '',
  ruleType: SchemaRuleType.VERIFICATION,
  ruleOperator: SchemaRuleOperator.PATTERN,
  ruleConfig: { regex: '' },
  priority: 5,
  enabled: true,
});

export function RuleEditor({ rules, onChange }: RuleEditorProps) {
  const baseId = useId();
  const buildId = (index: number, suffix: string) => `${baseId}-${index}-${suffix}`;

  const updateRule = (index: number, patch: Partial<RuleDraft>) => {
    const next = rules.map((rule, idx) =>
      idx === index ? { ...rule, ...patch } : rule,
    );
    onChange(next);
  };

  const handleAddRule = () => {
    onChange([...rules, createEmptyRule()]);
  };

  const handleRemoveRule = (index: number) => {
    onChange(rules.filter((_, idx) => idx !== index));
  };

  const renderConfigEditor = (rule: RuleDraft, index: number) => {
    switch (rule.ruleOperator) {
      case SchemaRuleOperator.PATTERN: {
        const regex = typeof rule.ruleConfig.regex === 'string' ? rule.ruleConfig.regex : '';
        return (
          <PatternConfigEditor
            value={regex}
            onChange={(value) =>
              updateRule(index, {
                ruleConfig: { ...rule.ruleConfig, regex: value },
              })
            }
          />
        );
      }
      case SchemaRuleOperator.ENUM: {
        const values = Array.isArray(rule.ruleConfig.values)
          ? (rule.ruleConfig.values as string[])
          : [];
        return (
          <EnumConfigEditor
            values={values}
            onChange={(nextValues) =>
              updateRule(index, {
                ruleConfig: { ...rule.ruleConfig, values: nextValues },
              })
            }
          />
        );
      }
      case SchemaRuleOperator.OCR_CORRECTION: {
        const mappings = Array.isArray(rule.ruleConfig.mappings)
          ? (rule.ruleConfig.mappings as Array<{ from: string; to: string }>)
          : [];
        return (
          <OcrCorrectionConfigEditor
            mappings={mappings}
            onChange={(nextMappings) =>
              updateRule(index, {
                ruleConfig: { ...rule.ruleConfig, mappings: nextMappings },
              })
            }
          />
        );
      }
      case SchemaRuleOperator.RANGE_MIN:
      case SchemaRuleOperator.RANGE_MAX:
      case SchemaRuleOperator.LENGTH_MIN:
      case SchemaRuleOperator.LENGTH_MAX: {
        const value = typeof rule.ruleConfig.value === 'number' ? rule.ruleConfig.value : 0;
        return (
          <div>
            <label htmlFor={buildId(index, 'config-value')} className="block text-xs font-medium text-muted-foreground">Value</label>
            <input
              id={buildId(index, 'config-value')}
              type="number"
              value={value}
              onChange={(event) =>
                updateRule(index, {
                  ruleConfig: { ...rule.ruleConfig, value: Number(event.target.value) },
                })
              }
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-xs focus:border-ring focus:outline-none focus:ring-ring"
            />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {rules.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No rules yet. Add a rule or generate with AI.
        </div>
      )}

      {rules.map((rule, index) => (
        <div key={`rule-${index}`} className="rounded-md border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">Rule {index + 1}</div>
            <button
              type="button"
              onClick={() => handleRemoveRule(index)}
              className="text-xs text-destructive hover:text-destructive"
            >
              Remove
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor={buildId(index, 'field-path')} className="block text-xs font-medium text-muted-foreground">Field Path</label>
              <input
                id={buildId(index, 'field-path')}
                type="text"
                value={rule.fieldPath}
                onChange={(event) => updateRule(index, { fieldPath: event.target.value })}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-xs focus:border-ring focus:outline-none focus:ring-ring"
                placeholder="invoice.po_no"
              />
            </div>
            <div>
              <label htmlFor={buildId(index, 'rule-type')} className="block text-xs font-medium text-muted-foreground">Rule Type</label>
              <select
                id={buildId(index, 'rule-type')}
                value={rule.ruleType}
                onChange={(event) => updateRule(index, { ruleType: event.target.value as SchemaRuleType })}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-xs focus:border-ring focus:outline-none focus:ring-ring"
              >
                {RULE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={buildId(index, 'operator')} className="block text-xs font-medium text-muted-foreground">Operator</label>
              <select
                id={buildId(index, 'operator')}
                value={rule.ruleOperator}
                onChange={(event) => {
                  const nextOperator = event.target.value as SchemaRuleOperator;
                  const patch: Partial<RuleDraft> = { ruleOperator: nextOperator };
                  if (nextOperator === SchemaRuleOperator.OCR_CORRECTION && !rule.fieldPath.trim()) {
                    patch.fieldPath = '*';
                  }
                  updateRule(index, patch);
                }}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-xs focus:border-ring focus:outline-none focus:ring-ring"
              >
                {RULE_OPERATOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={buildId(index, 'priority')} className="block text-xs font-medium text-muted-foreground">Priority (0-10)</label>
              <input
                id={buildId(index, 'priority')}
                type="number"
                min={0}
                max={10}
                value={rule.priority ?? 0}
                onChange={(event) => updateRule(index, { priority: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-xs focus:border-ring focus:outline-none focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor={buildId(index, 'error-message')} className="block text-xs font-medium text-muted-foreground">Error Message</label>
              <input
                id={buildId(index, 'error-message')}
                type="text"
                value={rule.errorMessage ?? ''}
                onChange={(event) => updateRule(index, { errorMessage: event.target.value })}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-xs focus:border-ring focus:outline-none focus:ring-ring"
                placeholder="Custom error message"
              />
            </div>
            <div>
              <label htmlFor={buildId(index, 'enabled')} className="block text-xs font-medium text-muted-foreground">Enabled</label>
              <select
                id={buildId(index, 'enabled')}
                value={rule.enabled === false ? 'false' : 'true'}
                onChange={(event) => updateRule(index, { enabled: event.target.value === 'true' })}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-xs focus:border-ring focus:outline-none focus:ring-ring"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={buildId(index, 'description')} className="block text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              id={buildId(index, 'description')}
              value={rule.description ?? ''}
              onChange={(event) => updateRule(index, { description: event.target.value })}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-xs focus:border-ring focus:outline-none focus:ring-ring"
              rows={2}
              placeholder="Optional description"
            />
          </div>

          <div className="rounded-md border border-border bg-background p-3">
            {renderConfigEditor(rule, index)}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddRule}
        className="w-full rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
      >
        + Add Manual Rule
      </button>
    </div>
  );
}




