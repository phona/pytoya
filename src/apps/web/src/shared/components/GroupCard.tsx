import { ArrowUpRight, FileText } from 'lucide-react';
import { Group } from '@/api/projects';
import { Button } from '@/shared/components/ui/button';
import { getGroupStatusBadgeClasses } from '@/shared/styles/status-badges';
import { useModalDialog } from '@/shared/hooks/use-modal-dialog';
import { useI18n } from '@/shared/providers/I18nProvider';

interface GroupCardProps {
  group: Group;
  onClick?: () => void;
  onDelete?: (id: number) => void;
  onEdit?: (group: Group) => void;
}

export function GroupCard({ group, onClick, onDelete, onEdit }: GroupCardProps) {
  const { t } = useI18n();
  const { confirm, ModalDialog } = useModalDialog();
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
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          <span>
            {t('groups.card.manifestsCount', {
              count: group._count?.manifests ?? 0,
              plural: (group._count?.manifests ?? 0) === 1 ? '' : 's',
            })}
          </span>
        </div>
        {onDelete && (
          <Button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void (async () => {
                const confirmed = await confirm({
                  title: t('groups.card.deleteTitle'),
                  message: t('groups.card.deleteMessage', { name: group.name }),
                  confirmText: t('common.delete'),
                  destructive: true,
                });
                if (!confirmed) return;
                onDelete(group.id);
              })();
            }}
            variant="ghost"
            size="sm"
            className={`text-destructive hover:text-destructive ${actionClasses}`}
          >
            {t('common.delete')}
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className={`rounded-full px-2 py-0.5 ${getGroupStatusBadgeClasses('pending')}`}>
          {t('groups.card.pendingCount', { count: statusCounts.pending })}
        </span>
        <span className={`rounded-full px-2 py-0.5 ${getGroupStatusBadgeClasses('failed')}`}>
          {t('groups.card.errorCount', { count: statusCounts.failed })}
        </span>
        <span className={`rounded-full px-2 py-0.5 ${getGroupStatusBadgeClasses('verified')}`}>
          {t('groups.card.verifiedCount', { count: statusCounts.verified })}
        </span>
      </div>

      {onClick ? (
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
          {t('common.view')}
          <ArrowUpRight className="h-3 w-3" />
        </div>
      ) : null}

      <ModalDialog />
    </div>
  );
}




