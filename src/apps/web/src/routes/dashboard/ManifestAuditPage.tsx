import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuditPanel } from '@/shared/components/manifests/AuditPanel';

type LocationState = {
  allManifestIds?: number[];
};

export function ManifestAuditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const projectId = Number(params.id);
  const groupId = Number(params.groupId);
  const manifestId = Number(params.manifestId);

  const state = (location.state ?? {}) as LocationState;
  const allManifestIds = Array.isArray(state.allManifestIds) && state.allManifestIds.length > 0
    ? state.allManifestIds
    : [manifestId];

  if (!Number.isFinite(projectId) || !Number.isFinite(groupId) || !Number.isFinite(manifestId)) {
    return null;
  }

  return (
    <div className="h-full min-h-0 w-full bg-background overflow-hidden">
      <AuditPanel
        projectId={projectId}
        groupId={groupId}
        manifestId={manifestId}
        onClose={() => navigate(`/projects/${projectId}/groups/${groupId}/manifests`)}
        allManifestIds={allManifestIds}
      />
    </div>
  );
}
