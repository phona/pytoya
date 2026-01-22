import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, MoreVertical, Settings2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Dialog, DialogDescription, DialogHeader, DialogSideContent, DialogTitle } from '@/shared/components/ui/dialog';
import { useManifestExtractionHistory } from '@/shared/hooks/use-manifests';
import { ExtractionHistoryPanel } from './ExtractionHistoryPanel';
import { useI18n } from '@/shared/providers/I18nProvider';

type ExtractionActionsMenuProps = {
  projectId?: number | null;
  manifestId: number;
  manifestName?: string;
};

export function ExtractionActionsMenu({ projectId, manifestId, manifestName }: ExtractionActionsMenuProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [historyOpen, setHistoryOpen] = useState(false);

  const historyQuery = useManifestExtractionHistory(manifestId, {
    limit: 50,
    enabled: historyOpen,
  });

  const history = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            title={t('manifests.actions.menuTitle')}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setHistoryOpen(true)}>
            <History className="h-4 w-4" />
            {t('manifests.actions.viewHistory')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!projectId}
            onSelect={() => {
              if (!projectId) return;
              navigate(`/projects/${projectId}/settings/rules`);
            }}
          >
            <Settings2 className="h-4 w-4" />
            {t('manifests.actions.updateRules')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogSideContent onClick={(event) => event.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>
              {t('manifests.actions.historyDialogTitle')}{manifestName ? `: ${manifestName}` : ''}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('manifests.actions.historyDialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <ExtractionHistoryPanel
            manifestId={manifestId}
            manifestName={manifestName ?? `manifest-${manifestId}`}
            history={history}
            loading={historyQuery.isLoading}
          />
        </DialogSideContent>
      </Dialog>
    </>
  );
}
