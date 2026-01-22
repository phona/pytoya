import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { AppBreadcrumbs } from '@/shared/components/AppBreadcrumbs';
import { useProject } from '@/shared/hooks/use-projects';
import { useProjectSchemas } from '@/shared/hooks/use-schemas';
import { cn } from '@/shared/lib/utils';

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
  if (tab === 'schema') return schemaId ? `/projects/${projectId}/settings/schema` : null;
  if (tab === 'rules') return schemaId ? `/projects/${projectId}/settings/rules` : null;
  if (tab === 'scripts') return `/projects/${projectId}/settings/validation-scripts`;
  return `/projects/${projectId}/settings/${tab}`;
};

const tabToLabel = (tab: ProjectSettingsTab) => {
  switch (tab) {
    case 'basic':
      return 'Basic';
    case 'models':
      return 'Models';
    case 'extractors':
      return 'Extractors';
    case 'costs':
      return 'Costs';
    case 'schema':
      return 'Schema';
    case 'rules':
      return 'Rules';
    case 'scripts':
      return 'Validation Scripts';
    default: {
      const exhaustive: never = tab;
      return exhaustive;
    }
  }
};

export function ProjectSettingsShell({
  projectId,
  activeTab,
  schemaIdOverride,
  containerClassName,
  children,
}: ProjectSettingsShellProps) {
  const navigate = useNavigate();
  const { project } = useProject(projectId);
  const { schemas } = useProjectSchemas(projectId);
  const schemaId = schemaIdOverride ?? schemas[0]?.id ?? null;
  const projectLabel = project?.name ?? `Project ${projectId}`;
  const activeTabLabel = tabToLabel(activeTab);

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
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="extractors">Extractors</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="schema" disabled={!schemaId}>Schema</TabsTrigger>
            <TabsTrigger value="rules" disabled={!schemaId}>Rules</TabsTrigger>
            <TabsTrigger value="scripts">Scripts</TabsTrigger>
          </TabsList>
        </Tabs>

        {!schemaId ? (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Schema and Rules are available after first extraction.
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
