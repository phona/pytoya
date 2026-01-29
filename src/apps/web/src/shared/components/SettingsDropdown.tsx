import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useI18n } from '@/shared/providers/I18nProvider';

export type SettingsDropdownProps = {
  projectId: number;
  schemaId?: number | null;
  onDelete?: () => void;
};

export function SettingsDropdown({ projectId, schemaId, onDelete }: SettingsDropdownProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const hasSchema = Boolean(schemaId);
  const schemaLink = `/projects/${projectId}/settings/schema`;
  const rulesLink = schemaId ? `/projects/${projectId}/settings/rules` : null;
  const scriptsLink = `/projects/${projectId}/settings/validation-scripts`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          {t('project.settingsDropdown.button')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('project.settingsDropdown.projectLabel')}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/settings/basic`)}>
          {t('project.settingsDropdown.basic')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/settings/models`)}>
          {t('project.settingsDropdown.models')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/settings/extractors`)}>
          {t('project.settingsDropdown.extractors')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/settings/costs`)}>
          {t('project.settingsDropdown.costs')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('project.settingsDropdown.dataLabel')}</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigate(schemaLink)}
        >
          {t('project.settingsDropdown.schema')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => rulesLink && navigate(rulesLink)}
          disabled={!hasSchema}
        >
          {t('project.settingsDropdown.rules')}
        </DropdownMenuItem>
        {!hasSchema && (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {t('project.settingsDropdown.availableAfterFirstExtraction')}
          </DropdownMenuLabel>
        )}
        <DropdownMenuItem onClick={() => navigate(scriptsLink)}>
          {t('project.settingsDropdown.validationScripts')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('project.settingsDropdown.dangerZone')}</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onDelete?.()}
          className="text-destructive focus:text-destructive"
        >
          {t('project.settingsDropdown.deleteProject')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}




