import { Model } from '@/api/models';
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

type ModelCardProps = {
  model: Model;
  onEdit?: (model: Model) => void;
  onDelete?: (id: string) => void;
  onTest?: (id: string) => void;
  isTesting?: boolean;
};

const formatParamSummary = (params: Record<string, unknown>) => {
  const entries = Object.entries(params).slice(0, 3);
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
};

export function ModelCard({ model, onEdit, onDelete, onTest, isTesting }: ModelCardProps) {
  const summary = formatParamSummary(model.parameters ?? {});

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
          <p className="text-sm text-gray-500">{model.description ?? 'No description'}</p>
        </div>
        <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">
          {model.adapterType}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
        <span className="rounded-full bg-gray-100 px-2 py-1">
          {model.category ?? 'unknown'}
        </span>
        <span className={model.isActive ? 'text-green-700' : 'text-gray-500'}>
          {model.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        {summary || 'No parameters set'}
      </div>

      <div className="mt-4 flex items-center justify-end">
        <TooltipProvider>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Model actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Actions</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              {onTest && (
                <DropdownMenuItem onClick={() => onTest(model.id)} disabled={isTesting}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(model)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(model.id)}>
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
