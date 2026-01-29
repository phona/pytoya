import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { AppBreadcrumbs } from '@/shared/components/AppBreadcrumbs';
import { useProject } from '@/shared/hooks/use-projects';
import { useProjectSchemas } from '@/shared/hooks/use-schemas';
import { cn } from '@/shared/lib/utils';
import { useI18n } from '@/shared/providers/I18nProvider';
import { isSchemaReadyForRules } from '@/shared/utils/schema';

export type ProjectSettingsTab = 'basic' | 'models' | 'extractors' | 'costs' | 'schema' | 'rules' | 'scripts';

export type ProjectSettingsShellProps = {
  projectId: number;
  activeTab: ProjectSettingsTab;
  schemaIdOverride?: number | null;
  containerClassName?: string;
  children: ReactNode;
};

const projectSettingsTabs = ['basic', 'models', 'extractors', 'costs', 'schema', 'rules', 'scripts'] as const;

const tabToPath = (projectId: number, tab: ProjectSettingsTab, schemaId: number | null) => {
  if (tab === 'costs') return `/projects/${projectId}/settings/costs`;
  if (tab === 'schema') return `/projects/${projectId}/settings/schema`;
  if (tab === 'rules') return schemaId ? `/projects/${projectId}/settings/rules` : null;
  if (tab === 'scripts') return `/projects/${projectId}/settings/validation-scripts`;
  return `/projects/${projectId}/settings/${tab}`;
};

export function ProjectSettingsShell({
  projectId,
  activeTab,
  schemaIdOverride,
  containerClassName,
  children,
}: ProjectSettingsShellProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { project } = useProject(projectId);
  const { schemas } = useProjectSchemas(projectId);
  const schemaId = schemaIdOverride ?? schemas[0]?.id ?? null;
  const activeSchema = schemaId ? (schemas.find((schema) => schema.id === schemaId) ?? null) : null;
  const schemaReady = isSchemaReadyForRules(activeSchema);
  const projectLabel = project?.name ?? `Project ${projectId}`;
  const tabLabels: Record<ProjectSettingsTab, string> = {
    basic: t('project.settingsDropdown.basic'),
    models: t('project.settingsDropdown.models'),
    extractors: t('project.settingsDropdown.extractors'),
    costs: t('project.settingsDropdown.costs'),
    schema: t('project.settingsDropdown.schema'),
    rules: t('project.settingsDropdown.rules'),
    scripts: t('project.settingsDropdown.validationScripts'),
  };
  const activeTabLabel = tabLabels[activeTab];

  return (
    <div className="min-h-screen bg-background">
      <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6', containerClassName)}>
        <AppBreadcrumbs
          items={[
            { label: 'Projects', to: '/projects' },
            { label: projectLabel, to: `/projects/${projectId}` },
            { label: 'Settings', to: `/projects/${projectId}/settings/basic` },
            { label: activeTabLabel },
          ]}
        />

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const nextTab = projectSettingsTabs.find((tab) => tab === value);
            if (!nextTab) return;
            const nextPath = tabToPath(projectId, nextTab, schemaId);
            if (!nextPath) return;
            navigate(nextPath);
          }}
        >
          <TabsList className="w-full justify-start overflow-x-auto" aria-label="Project settings sections">
            <TabsTrigger value="basic">{tabLabels.basic}</TabsTrigger>
            <TabsTrigger value="models">{tabLabels.models}</TabsTrigger>
            <TabsTrigger value="extractors">{tabLabels.extractors}</TabsTrigger>
            <TabsTrigger value="costs">{tabLabels.costs}</TabsTrigger>
            <TabsTrigger value="schema">{tabLabels.schema}</TabsTrigger>
            <TabsTrigger value="rules" disabled={!schemaReady}>{tabLabels.rules}</TabsTrigger>
            <TabsTrigger value="scripts">{tabLabels.scripts}</TabsTrigger>
          </TabsList>
        </Tabs>

        {!schemaReady ? (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {t('project.settingsShell.noSchemaHint')}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
