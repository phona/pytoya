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

export type SettingsDropdownProps = {
  projectId: number;
  schemaId?: number | null;
  onDelete?: () => void;
};

export function SettingsDropdown({ projectId, schemaId, onDelete }: SettingsDropdownProps) {
  const navigate = useNavigate();
  const hasSchema = Boolean(schemaId);
  const schemaLink = schemaId ? `/projects/${projectId}/settings/schema` : null;
  const rulesLink = schemaId ? `/projects/${projectId}/settings/rules` : null;
  const scriptsLink = `/projects/${projectId}/settings/validation-scripts`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Project</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/settings/basic`)}>
          Basic
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/settings/models`)}>
          Models
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/settings/extractors`)}>
          Extractors
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/settings/costs`)}>
          Costs
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Data</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => schemaLink && navigate(schemaLink)}
          disabled={!hasSchema}
        >
          Schema
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => rulesLink && navigate(rulesLink)}
          disabled={!hasSchema}
        >
          Rules
        </DropdownMenuItem>
        {!hasSchema && (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Available after first extraction
          </DropdownMenuLabel>
        )}
        <DropdownMenuItem onClick={() => navigate(scriptsLink)}>
          Validation Scripts
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Danger Zone</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onDelete?.()}
          className="text-destructive focus:text-destructive"
        >
          Delete Project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}




