import { render, screen } from '@/tests/utils';
import { CostBadge } from './CostBadge';

describe('CostBadge', () => {
  it('renders formatted cost values', () => {
    render(<CostBadge label="Total" value={0.1234} currency="USD" helperText="Test" />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('0.1234')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders placeholder when value is missing', () => {
    render(<CostBadge label="Average" value={undefined} />);

    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });
});
