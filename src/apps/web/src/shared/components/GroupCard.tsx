import { ArrowUpRight, FileText } from 'lucide-react';
import { Group } from '@/api/projects';
import { Button } from '@/shared/components/ui/button';
import { getGroupStatusBadgeClasses } from '@/shared/styles/status-badges';

interface GroupCardProps {
  group: Group;
  onClick?: () => void;
  onDelete?: (id: number) => void;
  onEdit?: (group: Group) => void;
}

export function GroupCard({ group, onClick, onDelete, onEdit }: GroupCardProps) {
  const statusCounts = group.statusCounts ?? {
    pending: 0,
    failed: 0,
    verified: 0,
  };
  const actionClasses = onClick
    ? 'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'
    : 'opacity-100';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`group bg-card rounded-lg shadow-sm border border-border p-4 transition-shadow ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h4 className="text-md font-medium text-foreground">{group.name}</h4>
        </div>
        <div className={`flex items-center gap-2 ${actionClasses}`}>
          {onEdit && (
            <Button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(group);
              }}
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary"
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          <span>{group._count?.manifests ?? 0} manifests</span>
        </div>
        {onDelete && (
          <Button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (confirm(`Delete group "${group.name}"? This will delete all manifests.`)) {
                onDelete(group.id);
              }
            }}
            variant="ghost"
            size="sm"
            className={`text-destructive hover:text-destructive ${actionClasses}`}
          >
            Delete
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className={`rounded-full px-2 py-0.5 ${getGroupStatusBadgeClasses('pending')}`}>
          {statusCounts.pending} pending
        </span>
        <span className={`rounded-full px-2 py-0.5 ${getGroupStatusBadgeClasses('failed')}`}>
          {statusCounts.failed} errors
        </span>
        <span className={`rounded-full px-2 py-0.5 ${getGroupStatusBadgeClasses('verified')}`}>
          {statusCounts.verified} verified
        </span>
      </div>

      {onClick ? (
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
          View
          <ArrowUpRight className="h-3 w-3" />
        </div>
      ) : null}
    </div>
  );
}




