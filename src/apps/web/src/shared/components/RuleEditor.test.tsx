import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RuleEditor, RuleDraft } from './RuleEditor';
import { SchemaRuleOperator, SchemaRuleType } from '@/api/schemas';

describe('RuleEditor', () => {
  it('renders empty state', () => {
    render(<RuleEditor rules={[]} onChange={vi.fn()} />);

    expect(screen.getByText(/No rules yet/i)).toBeInTheDocument();
  });

  it('adds a rule when clicking add', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RuleEditor rules={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Add Manual Rule/i }));

    expect(onChange).toHaveBeenCalled();
    const nextRules = onChange.mock.calls[0][0] as RuleDraft[];
    expect(nextRules).toHaveLength(1);
    expect(nextRules[0].ruleType).toBe(SchemaRuleType.VERIFICATION);
    expect(nextRules[0].ruleOperator).toBe(SchemaRuleOperator.PATTERN);
  });

  it('updates field path', async () => {
    const user = userEvent.setup();
    const rules: RuleDraft[] = [
      {
        fieldPath: '',
        ruleType: SchemaRuleType.VERIFICATION,
        ruleOperator: SchemaRuleOperator.PATTERN,
        ruleConfig: { regex: '' },
        priority: 5,
        enabled: true,
      },
    ];

    const Harness = () => {
      const [currentRules, setCurrentRules] = useState<RuleDraft[]>(rules);
      return <RuleEditor rules={currentRules} onChange={setCurrentRules} />;
    };

    render(<Harness />);

    const input = screen.getByPlaceholderText(/invoice.po_no/i);
    await user.type(input, 'invoice.po_no');

    expect(input).toHaveValue('invoice.po_no');
  });
});
