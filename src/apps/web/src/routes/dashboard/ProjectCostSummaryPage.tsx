import { useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectCostSummary } from '@/shared/hooks/use-extractor-costs';
import { ProjectCostSummary } from '@/shared/components/ProjectCostSummary';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

export function ProjectCostSummaryPage() {
  const navigate = useNavigate();
  const params = useParams();
  const projectId = Number(params.id);
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  const { summary, isLoading } = useProjectCostSummary(projectId, dateRange);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(`/projects/${projectId}`)}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cost Summary</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track extraction costs over time and by extractor.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateRange.from ?? ''}
              onChange={(event) => setDateRange((prev) => ({ ...prev, from: event.target.value || undefined }))}
              aria-label="From date"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateRange.to ?? ''}
              onChange={(event) => setDateRange((prev) => ({ ...prev, to: event.target.value || undefined }))}
              aria-label="To date"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading cost summary...
          </div>
        ) : (
          <ProjectCostSummary summary={summary} />
        )}
      </div>
    </div>
  );
}
