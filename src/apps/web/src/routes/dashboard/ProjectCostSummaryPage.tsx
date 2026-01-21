import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useProjectCostSummary } from '@/shared/hooks/use-extractor-costs';
import { ProjectCostSummary } from '@/shared/components/ProjectCostSummary';
import { Input } from '@/shared/components/ui/input';
import { ProjectSettingsShell } from '@/shared/components/ProjectSettingsShell';

export function ProjectCostSummaryPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  const { summary, isLoading } = useProjectCostSummary(projectId, dateRange);

  return (
    <ProjectSettingsShell projectId={projectId} activeTab="costs">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cost Summary</h2>
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
    </ProjectSettingsShell>
  );
}
