import { ChevronDown, Play } from 'lucide-react';
import { Manifest } from '@/api/manifests';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { getStatusBadgeClasses } from '@/shared/styles/status-badges';
import { useI18n } from '@/shared/providers/I18nProvider';

export type AuditPanelTab = 'form' | 'extraction' | 'ocr' | 'validation' | 'history';

type AuditPanelFunctionsMenuProps = {
  activeTab: AuditPanelTab;
  onTabChange: (tab: AuditPanelTab) => void;
  onRunValidation: () => void;
  runValidationPending?: boolean;
  validationLabel?: string;
  validationStatus?: Manifest['status'] | null;
};

const tabOptions: Array<{ value: AuditPanelTab; label: string }> = [
  { value: 'form', label: 'audit.tab.form' },
  { value: 'extraction', label: 'audit.tab.extraction' },
  { value: 'ocr', label: 'audit.tab.ocr' },
  { value: 'history', label: 'audit.tab.history' },
  { value: 'validation', label: 'audit.tab.validation' },
];

const getActiveTabLabelKey = (tab: AuditPanelTab) =>
  tabOptions.find((option) => option.value === tab)?.label ?? 'audit.menu.sections';

export function AuditPanelFunctionsMenu({
  activeTab,
  onTabChange,
  onRunValidation,
  runValidationPending = false,
  validationLabel = '',
  validationStatus = null,
}: AuditPanelFunctionsMenuProps) {
  const { t } = useI18n();
  const activeTabLabel = t(getActiveTabLabelKey(activeTab));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          title={t('audit.menu.sections')}
          onClick={(event) => event.stopPropagation()}
        >
          {activeTabLabel}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuLabel>{t('audit.menu.sections')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={activeTab}
          onValueChange={(value) => onTabChange(value as AuditPanelTab)}
        >
          {tabOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {t(option.label)}
              {option.value === 'validation' && validationLabel ? (
                <span
                  className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-full ${
                    validationStatus ? getStatusBadgeClasses(validationStatus) : ''
                  }`}
                >
                  {validationLabel}
                </span>
              ) : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={runValidationPending} onSelect={onRunValidation}>
          <Play className="h-4 w-4" />
          {runValidationPending ? t('audit.menu.runningValidation') : t('audit.menu.runValidation')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
