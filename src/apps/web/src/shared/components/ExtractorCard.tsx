import { Extractor, ExtractorCostSummary } from '@/api/extractors';
import { MoreHorizontal, PlayCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { CostBadge } from '@/shared/components/CostBadge';

const formatParamSummary = (params: Record<string, unknown>) => {
  const entries = Object.entries(params)
    .filter(([_key, value]) => value !== '********')
    .filter(([key]) => key !== 'pricing')
    .slice(0, 3);
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
};

export type ExtractorCardProps = {
  extractor: Extractor;
  costSummary?: ExtractorCostSummary;
  onEdit?: (extractor: Extractor) => void;
  onDelete?: (id: string) => void;
  onTest?: (id: string) => void;
  isTesting?: boolean;
};

export function ExtractorCard({
  extractor,
  costSummary,
  onEdit,
  onDelete,
  onTest,
  isTesting,
}: ExtractorCardProps) {
  const summary = formatParamSummary(extractor.config ?? {});
  const avgCost = costSummary?.averageCostPerExtraction ?? 0;
  const totalCost = costSummary?.totalCost ?? 0;
  const totalExtractions = costSummary?.totalExtractions ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{extractor.name}</h3>
          <p className="text-sm text-muted-foreground">{extractor.description ?? 'No description'}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
          {extractor.extractorType}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-1">
          {extractor.isActive ? 'Active' : 'Inactive'}
        </span>
        <span>
          Used by {extractor.usageCount ?? 0} project{(extractor.usageCount ?? 0) === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {summary || 'No parameters set'}
      </div>

      <div className="mt-4 space-y-2">
        <CostBadge
          label="Avg cost"
          value={avgCost}
          currency={(extractor.config?.pricing as { currency?: string } | undefined)?.currency}
          helperText={totalExtractions ? `${totalExtractions} extractions` : 'No extractions yet'}
        />
        <CostBadge
          label="Total spend"
          value={totalCost}
          currency={(extractor.config?.pricing as { currency?: string } | undefined)?.currency}
          helperText={totalExtractions ? `${totalExtractions} total` : 'No spend recorded'}
        />
      </div>

      <div className="mt-4 flex items-center justify-end">
        <TooltipProvider>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Extractor actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Actions</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              {onTest && (
                <DropdownMenuItem onClick={() => onTest(extractor.id)} disabled={isTesting}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(extractor)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(extractor.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      </div>
    </div>
  );
}
